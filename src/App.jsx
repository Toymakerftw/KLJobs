import { useState, useEffect, useCallback } from "react";
import { Briefcase, Search, Menu } from "lucide-react";
import { supabase } from "./supabaseClient";
import debounce from "lodash.debounce";

const KLJobs = () => {
  // Particle animation state
  const [shapes, setShapes] = useState([]);

  // Job listing state
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const perPage = 12;

  // Initialize particles
  useEffect(() => {
    const initialShapes = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      dx: (Math.random() - 0.5) * 2,
      dy: (Math.random() - 0.5) * 2,
      size: Math.random() * 10 + 5, // Initial size
      color: `hsl(${Math.random() * 360}, 70%, 80%)`,
    }));
    setShapes(initialShapes);

    const interval = setInterval(() => {
      setShapes((prevShapes) =>
        prevShapes.map((shape) => {
          let newX = shape.x + shape.dx;
          let newY = shape.y + shape.dy;

          if (newX < 0 || newX > window.innerWidth) shape.dx *= -1;
          if (newY < 0 || newY > window.innerHeight) shape.dy *= -1;

          // Randomize size change (optional, adds more dynamic look)
          const sizeChange = (Math.random() - 0.5) * 0.5; // Small random change
          const newSize = Math.max(5, Math.min(15, shape.size + sizeChange)); // Keep size within bounds

          return {
            ...shape,
            x: Math.max(0, Math.min(window.innerWidth, newX)),
            y: Math.max(0, Math.min(window.innerHeight, newY)),
            size: newSize, // Update size
          };
        })
      );
    }, 16);

    return () => clearInterval(interval);
  }, []);

  // Debounce search query updates
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Reset pagination when debounced search changes
  useEffect(() => {
    setPage(1);
    setJobs([]);
    setHasMore(true);
  }, [debouncedSearchQuery]);

  // Fetch jobs with parameters
  const fetchJobs = useCallback(async (currentPage, currentSearchQuery) => {
    setIsLoading(true);
    try {
      const from = (currentPage - 1) * perPage;
      const to = currentPage * perPage - 1;

      let queryBuilder = supabase
        .from("jobs")
        .select("*");

      if (currentSearchQuery.trim()) {
        queryBuilder = queryBuilder.or(
          `role.ilike.%${currentSearchQuery}%,company.ilike.%${currentSearchQuery}%,tech_park.ilike.%${currentSearchQuery}%`
        );
      }

      const { data, error } = await queryBuilder.range(from, to);

      if (error) throw error;

      setJobs((prev) =>
        currentPage === 1 ? data || [] : [...prev, ...(data || [])]
      );
      setHasMore((data || []).length === perPage);
      setPage(currentPage + 1);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and search handler
  useEffect(() => {
    fetchJobs(1, debouncedSearchQuery);
  }, [debouncedSearchQuery, fetchJobs]);

  // Infinite scroll handler
  const handleScroll = useCallback(
    debounce(() => {
      const { scrollTop, clientHeight, scrollHeight } = document.documentElement;
      if (
        scrollTop + clientHeight >= scrollHeight - 100 &&
        !isLoading &&
        hasMore
      ) {
        fetchJobs(page, debouncedSearchQuery);
      }
    }, 300),
    [isLoading, hasMore, page, debouncedSearchQuery, fetchJobs]
  );

  // Scroll event listener
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Search input handler
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 relative overflow-hidden">
      {/* Moving Background Particles */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        {shapes.map((shape) => (
          <div
            key={shape.id}
            style={{
              position: "absolute",
              left: `${shape.x}px`,
              top: `${shape.y}px`,
              width: `${shape.size}px`,
              height: `${shape.size}px`,
              backgroundColor: shape.color,
              borderRadius: "50%",
              opacity: 0.5,
              filter: "blur(2px)",
            }}
          ></div>
        ))}
      </div>

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 w-full z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Briefcase className="text-blue-600" />
              <span className="ml-2 text-blue-600 font-bold text-xl">
                KL Jobs
              </span>
            </div>

            <ul className="hidden sm:flex space-x-8">
              <li>
                <a
                  href="#"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Find Jobs
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  For Employers
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Pricing
                </a>
              </li>
            </ul>

            <div className="hidden sm:flex items-center">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                Login
              </button>
            </div>

            <Menu className="sm:hidden text-blue-600 cursor-pointer" />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-white pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
            <Briefcase className="w-16 h-16 inline-block mr-4 text-blue-600" />
            Find Your Dream IT Job in Kerala
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-500">
            Explore top job opportunities in IT parks across Kerala and take
            your career to the next level 🚀
          </p>
          <div className="mt-10 relative max-w-md mx-auto">
            <Search className="absolute left-4 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={handleSearch}
              className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
            />
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <section className="px-6 pb-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {jobs.length > 0 ? (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {job.role}
                    </h2>
                    <p className="mt-2 text-gray-600">{job.company}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {job.tech_park}
                    </p>
                    <div className="mt-6">
                      <a
                        href={job.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-block bg-blue-600 text-white py-2 px-4 rounded-md text-center hover:bg-blue-700 transition"
                      >
                        Apply Now
                      </a>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 mt-8 col-span-full">
                {isLoading ? "Loading jobs..." : "No jobs found matching your search criteria."}
              </p>
            )}
          </div>

          {/* Loading Indicator */}
          {isLoading && jobs.length > 0 && (
            <div className="text-center my-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          )}

          {/* End of Results */}
          {!hasMore && !isLoading && jobs.length > 0 && (
            <p className="text-center text-gray-500 mt-8">
              You've reached the end of available jobs
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="text-gray-600 text-sm">
            © {new Date().getFullYear()} KL Jobs. All rights reserved.
          </div>
          <ul className="flex space-x-6">
            <li>
              <a href="#" className="text-gray-600 hover:text-gray-800 text-sm">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#" className="text-gray-600 hover:text-gray-800 text-sm">
                Terms of Service
              </a>
            </li>
            <li>
              <a href="#" className="text-gray-600 hover:text-gray-800 text-sm">
                Contact Us
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
};

export default KLJobs;
