import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { createClient } from 'redis';

dotenv.config();

// Create a connection pool outside the handler to reuse connections (best practice for serverless)
let pool;

if (!pool) {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 1, // Keep limit low for serverless to avoid exhausting DB connections
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false // Often needed for remote connections depending on cert setup
    }
  });
}

let redisClient;

export default async function handler(req, res) {
  // Set CORS headers to allow requests from any origin (or configure specific domains)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = 9; // Match frontend perPage
  const offset = (page - 1) * limit;

  const { role, company, location } = req.query;

  // ---------------------------------------------------------
  // 1. Try fetching from Redis first
  // ---------------------------------------------------------
  try {
    if (!redisClient) {
      const url = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
      redisClient = createClient({
        url,
        password: process.env.REDIS_PASSWORD || undefined
      });
      redisClient.on('error', (err) => console.error('Redis Client Error', err));
      await redisClient.connect();
    }

    if (redisClient.isOpen) {
      const cachedData = await redisClient.get('jobs_data');
      if (cachedData) {
        let jobs = JSON.parse(cachedData);

        // --- Date Parsing Helper ---
        const parseDate = (dateStr) => {
          if (!dateStr || dateStr === 'N/A') return null;
          // Attempt to parse "DD-MM-YYYY" or similar formats
          // 1. Try DD-MM-YYYY
          let parts = dateStr.match(/(\d{2})[\/-](\d{2})[\/-](\d{4})/);
          if (parts) {
            return new Date(`${parts[3]}-${parts[2]}-${parts[1]}`); // YYYY-MM-DD
          }
          // 2. Try standard Date.parse (e.g. "Oct 24, 2025")
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) return d;
          return null;
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const isJobActive = (j) => {
          const d = parseDate(j.deadline);
          // Keep if date is invalid/N/A or if date is today or future
          return !d || d >= today;
        };

        // --- In-Memory Filtering ---
        if (role && role.trim()) {
          const term = role.trim().toLowerCase();
          jobs = jobs.filter(j =>
            (j.role && j.role.toLowerCase().includes(term)) ||
            (j.job_title && j.job_title.toLowerCase().includes(term)) || // Search in cleaned title
            (j.company && j.company.toLowerCase().includes(term)) ||
            (j.tech_park && j.tech_park.toLowerCase().includes(term)) ||
            (j.skills && Array.isArray(j.skills) && j.skills.some(s => s.toLowerCase().includes(term))) // Search in skills
          );
        }

        if (company && company.trim()) {
          const term = company.trim().toLowerCase();
          jobs = jobs.filter(j => j.company && j.company.toLowerCase().includes(term));
        }

        if (location && location.trim()) {
          const term = location.trim().toLowerCase();
          jobs = jobs.filter(j =>
            (j.tech_park && j.tech_park.toLowerCase().includes(term)) ||
            (j.clean_address && j.clean_address.toLowerCase().includes(term)) || // Search in cleaned address
            (j.address && j.address.toLowerCase().includes(term)) ||
            (j.company_profile && j.company_profile.toLowerCase().includes(term))
          );
        }

        // --- Filter Expired Jobs ---
        jobs = jobs.filter(isJobActive);

        // --- Pagination ---
        const paginatedJobs = jobs.slice(offset, offset + limit);

        // --- Mapping to Frontend Expected Format ---
        const processedRows = paginatedJobs.map(j => ({
          ...j,
          role: j.job_title || j.role, // Prefer cleaned title
          description: j.clean_description || j.original_description || j.description,
          email: j.clean_email || j.email,
          company_profile: j.job_summary || j.summary || j.company_profile,
          skills: j.skills || [],
          experience: j.experience_required || j.experience || null,
          address: j.clean_address || j.address || null // Prefer cleaned address
        }));

        return res.status(200).json(processedRows);
      }
    }
  } catch (err) {
    console.warn("Redis fetch failed, falling back to DB:", err.message);
    // Proceed to MySQL fallback
  }

  // ---------------------------------------------------------
  // 2. Fallback to MySQL
  // ---------------------------------------------------------
  try {
    let query = 'SELECT * FROM jobs';
    let whereClauses = [];
    let params = [];

    // Helper for LIKE pattern
    const getLikePattern = (term) => `%${term}%`;

    // Role Filter (matches role, company, or tech_park) - mirroring Supabase logic
    if (role && role.trim()) {
      whereClauses.push('(role LIKE ? OR company LIKE ? OR tech_park LIKE ?)');
      const term = getLikePattern(role.trim());
      params.push(term, term, term);
    }

    // Company Filter
    if (company && company.trim()) {
      whereClauses.push('(company LIKE ?)');
      const term = getLikePattern(company.trim());
      params.push(term);
    }

    // Location Filter (matches tech_park or company_profile)
    if (location && location.trim()) {
      whereClauses.push('(tech_park LIKE ? OR company_profile LIKE ?)');
      const term = getLikePattern(location.trim());
      params.push(term, term);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Add sorting (Newest first) and pagination
    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);

    const processedRows = rows.map(row => {
      let cleaned = row.cleaned_data;
      
      // Ensure cleaned is an object if it's not null/undefined
      if (cleaned && typeof cleaned === 'string') {
        try {
          cleaned = JSON.parse(cleaned);
        } catch (e) {
          console.error("Failed to parse cleaned_data for job id:", row.id, e);
          cleaned = null;
        }
      }

      if (cleaned) {
        return {
          ...row,
          role: cleaned.job_title || row.role,
          description: cleaned.clean_description || row.description,
          email: cleaned.clean_email || row.email, // Prioritize clean email
          company_profile: cleaned.job_summary || row.company_profile,
          skills: cleaned.skills || [], // New field
          experience: cleaned.experience_required || null, // New field
          // We keep original tech_park for the badge, but add address if available
          address: cleaned.clean_address || null 
        };
      }
      return row;
    });

    res.status(200).json(processedRows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}