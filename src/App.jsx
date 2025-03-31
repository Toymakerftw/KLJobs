import { useState, useEffect, useCallback, useRef } from "react";
import {
  Briefcase,
  Search,
  Menu,
  ArrowUp,
  ChevronDown,
  Building,
  MapPin,
  ChevronUp,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import debounce from "lodash.debounce";

const SearchBar = ({ onSearch }) => {
  const [searchForm, setSearchForm] = useState({
    role: "",
    company: "",
    location: "",
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchForm);
  };

  const handleReset = () => {
    setSearchForm({
      role: "",
      company: "",
      location: "",
    });
    onSearch({ role: "", company: "", location: "" });
  };

  return (
    <div className="mt-10 w-full max-w-3xl mx-auto transform transition-all animate-slideUp">
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Find Your Next Opportunity
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Main search input */}
            <div className="relative transition-all duration-300">
              <Search className="absolute left-4 top-3.5 transition-colors text-gray-400" />
              <input
                type="text"
                placeholder="Search for jobs, companies, or tech parks..."
                name="role"
                value={searchForm.role}
                onChange={handleInputChange}
                onFocus={() => setIsExpanded(true)}
                onBlur={() => setIsExpanded(false)}
                className="block w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-gray-50 focus:bg-white"
              />
            </div>

            {/* Advanced search fields - conditionally rendered */}
            <div className={`space-y-4 transition-all duration-500 ease-in-out ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
              {/* Company search input */}
              <div className="relative transition-all duration-300">
                <Building className="absolute left-4 top-3.5 transition-colors text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by company..."
                  name="company"
                  value={searchForm.company}
                  onChange={handleInputChange}
                  className="block w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-gray-50 focus:bg-white"
                />
              </div>

              {/* Location search input */}
              <div className="relative transition-all duration-300">
                <MapPin className="absolute left-4 top-3.5 transition-colors text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by location..."
                  name="location"
                  value={searchForm.location}
                  onChange={handleInputChange}
                  className="block w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-medium transition-all duration-300 shadow-sm hover:shadow flex items-center justify-center"
              >
                <Search className="w-5 h-5 mr-2" />
                Find Jobs
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="sm:w-auto py-4 px-6 border border-blue-600 text-blue-600 rounded-xl font-medium transition-all duration-300 hover:bg-blue-50 flex items-center justify-center"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-6 h-6 mr-2" />
                    <span>Less Filters</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-6 h-6 mr-2" />
                    <span>More Filters</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-5 pt-5 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
          <p>Popular: React, Python, UI/UX</p>
          <span
            onClick={handleReset}
            className="text-blue-600 cursor-pointer hover:underline"
          >
            Clear All
          </span>
        </div>
      </div>
    </div>
  );
};

const KLJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [searchForm, setSearchForm] = useState({
    role: "",
    company: "",
    location: "",
  });
  const [debouncedSearchForm, setDebouncedSearchForm] = useState({
    role: "",
    company: "",
    location: "",
  });
  const [showBackToTop, setShowBackToTop] = useState(false);
  const perPage = 9;

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  // Debounce the search form updates
  const debouncedSetSearchForm = useCallback(
    debounce((form) => {
      setDebouncedSearchForm(form);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSetSearchForm(searchForm);
  }, [searchForm, debouncedSetSearchForm]);

  useEffect(() => {
    setPage(1);
    setJobs([]);
    setHasMore(true);
  }, [debouncedSearchForm]);

  const fetchJobs = useCallback(
    async (currentPage, currentSearchForm) => {
      setIsLoading(true);
      try {
        const from = (currentPage - 1) * perPage;
        const to = currentPage * perPage - 1;

        let queryBuilder = supabase.from("jobs").select("*");

        if (currentSearchForm.role.trim()) {
          queryBuilder = queryBuilder.or(
            `role.ilike.%${currentSearchForm.role}%,company.ilike.%${currentSearchForm.role}%,tech_park.ilike.%${currentSearchForm.role}%`
          );
        }

        if (currentSearchForm.company.trim()) {
          queryBuilder = queryBuilder.or(
            `company.ilike.%${currentSearchForm.company}%`
          );
        }

        if (currentSearchForm.location.trim()) {
          queryBuilder = queryBuilder.or(
            `tech_park.ilike.%${currentSearchForm.location}%,company_profile.ilike.%${currentSearchForm.location}%`
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
    },
    []
  );

  useEffect(() => {
    fetchJobs(1, debouncedSearchForm);
  }, [debouncedSearchForm, fetchJobs]);

  useEffect(() => {
    const handleAnchorClick = (e) => {
      const target = e.target.closest('a[href^="#"]');
      if (!target) return;

      const id = target.getAttribute("href");
      if (!id || id === "#") return;

      const element = document.querySelector(id);
      if (element) {
        e.preventDefault();
        element.scrollIntoView({
          behavior: "smooth",
        });
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const loadMoreJobs = () => {
    if (!isLoading && hasMore) {
      fetchJobs(page, debouncedSearchForm);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 text-gray-900">
      <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200 fixed top-0 left-0 w-full z-20 shadow-sm">
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
                  className="border-b-2 border-blue-600 text-blue-600 hover:text-blue-800 inline-flex items-center px-1 pt-1 text-sm font-medium"
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
              <button className="bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 mr-3 transition-all duration-300">
                Sign Up
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all duration-300">
                Login
              </button>
            </div>

            <Menu className="sm:hidden text-blue-600 cursor-pointer" />
          </div>
        </div>
      </nav>

      <section className="bg-transparent pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fadeIn">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              <Briefcase className="w-12 h-12 md:w-16 md:h-16 inline-block mr-4 text-blue-600" />
              Find Your Dream IT Job in Kerala
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
              Explore top job opportunities in IT parks across Kerala and take
              your career to the next level 🚀
            </p>
          </div>

          <SearchBar onSearch={setSearchForm} />
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {jobs.length > 0 ? (
              jobs.map((job, index) => (
                <div
                  key={job.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    animation: "fadeIn 0.5s ease-out forwards",
                    opacity: 0,
                  }}
                >
                  <div className="p-6">
                    <div className="flex items-start">
                      <div className="flex-grow">
                        <h2 className="text-xl font-semibold text-gray-900 line-clamp-2">
                          {job.role}
                        </h2>
                        <p className="mt-2 text-gray-600 font-medium">
                          {job.company}
                        </p>
                        <p className="mt-1 text-sm text-gray-500 flex items-center">
                          <svg
                            className="w-4 h-4 mr-1 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {job.tech_park}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <a
                        href={job.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-block bg-blue-600 text-white py-2.5 px-4 rounded-lg text-center hover:bg-blue-700 transition-all duration-300 shadow-sm hover:shadow"
                      >
                        Apply Now
                      </a>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 animate-pulse"
                    >
                      <div className="p-6">
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
                        <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 mt-8 col-span-full">
                    No jobs found matching your search criteria.
                  </p>
                )}
              </>
            )}
          </div>

          {hasMore && (
            <div className="text-center my-8">
              <button
                onClick={loadMoreJobs}
                disabled={isLoading}
                className="bg-blue-600 text-white py-2.5 px-6 rounded-lg text-center hover:bg-blue-700 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  "Load More"
                )}
              </button>
            </div>
          )}

          {!hasMore && !isLoading && jobs.length > 0 && (
            <p className="text-center text-gray-500 mt-8 py-4 border-t border-gray-100">
              You've reached the end of available jobs
            </p>
          )}
        </div>
      </section>

      <footer className="bg-white border-t border-gray-200 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:justify-between">
            <div className="mb-8 md:mb-0">
              <div className="flex items-center">
                <Briefcase className="text-blue-600" />
                <span className="ml-2 text-blue-600 font-bold text-xl">
                  KL Jobs
                </span>
              </div>
              <p className="text-gray-600 text-sm mt-2 max-w-xs">
                Connecting Kerala's tech talent with leading companies in the
                state's growing IT ecosystem.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
                  For Job Seekers
                </h3>
                <ul className="mt-4 space-y-2">
                  <li>
                    <a
                      href="#"
                      className="text-gray-600 hover:text-gray-800 text-sm transition-colors duration-200"
                    >
                      Browse Jobs
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-gray-600 hover:text-gray-800 text-sm transition-colors duration-200"
                    >
                      Company Reviews
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-gray-600 hover:text-gray-800 text-sm transition-colors duration-200"
                    >
                      Salary Guide
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
                  For Employers
                </h3>
                <ul className="mt-4 space-y-2">
                  <li>
                    <a
                      href="#"
                      className="text-gray-600 hover:text-gray-800 text-sm transition-colors duration-200"
                    >
                      Post a Job
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-gray-600 hover:text-gray-800 text-sm transition-colors duration-200"
                    >
                      Pricing
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-gray-600 hover:text-gray-800 text-sm transition-colors duration-200"
                    >
                      Resources
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
                  Legal
                </h3>
                <ul className="mt-4 space-y-2">
                  <li>
                    <a
                      href="#"
                      className="text-gray-600 hover:text-gray-800 text-sm transition-colors duration-200"
                    >
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-gray-600 hover:text-gray-800 text-sm transition-colors duration-200"
                    >
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-gray-600 hover:text-gray-800 text-sm transition-colors duration-200"
                    >
                      Contact Us
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 md:flex md:items-center md:justify-between">
            <div className="text-gray-600 text-sm">
              © {new Date().getFullYear()} KL Jobs. All rights reserved.
            </div>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a
                href="#"
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <span className="sr-only">Facebook</span>
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <span className="sr-only">Twitter</span>
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-gray-800 transition-colors duration-200"
              >
                <span className="sr-only">LinkedIn</span>
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg transition-all duration-300 hover:bg-blue-700 z-50 ${
          showBackToTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-label="Back to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
};

export default KLJobs;
