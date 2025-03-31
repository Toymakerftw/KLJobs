import { useState, useEffect, useCallback, useRef } from "react";
import { Briefcase, Search, Menu, ArrowUp } from "lucide-react";
import { supabase } from "./supabaseClient";
import debounce from "lodash.debounce";

const KLJobs = () => {
  const scrollRef = useRef(0);
  const requestRef = useRef();
  const previousTimeRef = useRef();

  const [shapes, setShapes] = useState([]);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const shapesRef = useRef([]);

  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const perPage = 12;

  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Softer, more harmonious colors with lower opacity
    const colors = [
      "rgba(59, 130, 246, 0.3)",  // blue
      "rgba(99, 102, 241, 0.2)",  // indigo
      "rgba(139, 92, 246, 0.2)",  // purple
      "rgba(236, 72, 153, 0.15)", // pink
      "rgba(248, 113, 113, 0.2)", // red
    ];

    // Reduce number of particles and make them more subtle
    const initialShapes = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * viewportWidth,
      y: Math.random() * viewportHeight * 2,
      // Slower movement for less jarring effect
      dx: (Math.random() - 0.5) * 0.8,
      dy: (Math.random() - 0.5) * 0.8,
      // Larger, softer particles
      size: Math.random() * 15 + 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 0.9 + Math.random() * 0.2, // Lower opacity range
      blur: 1 + Math.random() * 5, // More blur for softer look
      speed: 0.2 + Math.random() * 0.5, // Slower speed
    }));

    setShapes(initialShapes);
    shapesRef.current = initialShapes;
  }, [viewportWidth, viewportHeight]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.style.scrollBehavior = "smooth";

      const handleScroll = () => {
        scrollRef.current = window.scrollY;
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", handleScroll);
        document.documentElement.style.scrollBehavior = "";
      };
    }
  }, []);

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

  const animateParticles = useCallback(
    (timestamp) => {
      if (previousTimeRef.current === undefined) {
        previousTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - previousTimeRef.current;
      previousTimeRef.current = timestamp;

      const cappedDeltaTime = Math.min(deltaTime, 100);

      setShapes((prevShapes) => {
        const updatedShapes = shapesRef.current.map((shape) => {
          const timeScale = cappedDeltaTime / 16;

          // Apply smoother, dampened movement
          let newX = shape.x + shape.dx * shape.speed * timeScale * 0.7;
          let newY = shape.y + shape.dy * shape.speed * timeScale * 0.7;

          // Smoother boundary behavior
          if (newX < -50 || newX > viewportWidth + 50) {
            shape.dx *= -1;
            newX = Math.max(-50, Math.min(newX, viewportWidth + 50));
          }

          const totalHeight = Math.max(document.body.scrollHeight, viewportHeight * 2);

          // Gentler repositioning when particles go out of bounds
          if (newY < -50 || newY > totalHeight + 50) {
            // Instead of random repositioning, bounce with dampening
            shape.dy *= -0.8;
            newY = newY < -50 ? -50 : totalHeight + 50;
          }

          return {
            ...shape,
            x: newX,
            y: newY,
          };
        });

        shapesRef.current = updatedShapes;
        return updatedShapes;
      });

      requestRef.current = requestAnimationFrame(animateParticles);
    },
    [viewportWidth, viewportHeight]
  );

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animateParticles);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animateParticles]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    setJobs([]);
    setHasMore(true);
  }, [debouncedSearchQuery]);

  const fetchJobs = useCallback(async (currentPage, currentSearchQuery) => {
    setIsLoading(true);
    try {
      const from = (currentPage - 1) * perPage;
      const to = currentPage * perPage - 1;

      let queryBuilder = supabase.from("jobs").select("*");

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

  useEffect(() => {
    fetchJobs(1, debouncedSearchQuery);
  }, [debouncedSearchQuery, fetchJobs]);

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

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const loadMoreJobs = () => {
    if (!isLoading && hasMore) {
      fetchJobs(page, debouncedSearchQuery);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 text-gray-900 relative overflow-hidden">
      {/* Background particles with improved aesthetics */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        {shapes.map((shape) => {
          const offsetY = scrollRef.current;
          const parallaxFactor = 0.05 + Math.random() * 0.1; // More subtle parallax
          const visualY = shape.y - offsetY * parallaxFactor;

          return (
            <div
              key={shape.id}
              style={{
                position: "absolute",
                left: `${shape.x}px`,
                top: `${visualY}px`,
                width: `${shape.size}px`,
                height: `${shape.size}px`,
                backgroundColor: shape.color,
                borderRadius: "50%",
                opacity: shape.opacity,
                filter: `blur(${shape.blur}px)`,
                transform: `translate3d(0, 0, 0)`,
                transition: "top 0.3s ease-out", // Smoother transitions
                willChange: "top, left",
              }}
            ></div>
          );
        })}
      </div>

      {/* Navbar */}
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

      {/* Hero section */}
      <section className="bg-transparent pt-28 pb-16 relative z-10">
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
          <div className="mt-10 relative max-w-md mx-auto transform transition-all animate-slideUp">
            <Search className="absolute left-4 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for jobs, companies, or tech parks..."
              value={searchQuery}
              onChange={handleSearch}
              className="block w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 sm:text-sm"
            />
          </div>
        </div>
      </section>

      {/* Job listings */}
      <section className="px-6 pb-16 relative z-10">
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

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-10 relative z-10 mt-auto">
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
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors duration-200">
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
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors duration-200">
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
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors duration-200">
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

      {/* Back to top button */}
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