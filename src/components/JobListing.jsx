import React, { useState } from 'react';
import {
  Briefcase,
  Building,
  Calendar,
  ExternalLink,
  MapPin,
  Mail,
  X,
  Clock,
  SearchX,
} from 'lucide-react';

const JobCard = ({ job }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <div
        onClick={openModal}
        className="group bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer h-full flex flex-col"
      >
        <div className="px-5 pt-5 pb-4 flex-grow">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
              {job.tech_park}
            </span>
          </div>
          
          <h2 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200 mt-2">
            {job.role}
          </h2>
          
          <div className="mt-3 space-y-2">
            <div className="flex items-center text-gray-600">
              <Building className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
              <p className="text-sm font-medium truncate">{job.company}</p>
            </div>
            
            <div className="flex items-center text-gray-500">
              <MapPin className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
              <p className="text-sm truncate">{job.tech_park}</p>
            </div>
            
            <div className="flex items-center text-gray-500">
              <Calendar className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
              <p className="text-xs">Deadline: {job.deadline}</p>
            </div>
          </div>
        </div>
        
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 mt-auto">
          <button className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg text-center hover:bg-blue-700 transition-all duration-300 shadow-sm hover:shadow flex items-center justify-center">
            <span>View Details</span>
            <ExternalLink className="w-4 h-4 ml-1.5" />
          </button>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-fadeIn" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">{job.role}</h2>
              <button 
                onClick={closeModal}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left column - Job details */}
                <div className="flex-grow space-y-6">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full">
                      <Building className="w-4 h-4 mr-1.5" />
                      <span className="text-sm font-medium">{job.company}</span>
                    </div>
                    <div className="flex items-center px-3 py-1.5 bg-green-50 text-green-600 rounded-full">
                      <MapPin className="w-4 h-4 mr-1.5" />
                      <span className="text-sm font-medium">{job.tech_park}</span>
                    </div>
                    <div className="flex items-center px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full">
                      <Clock className="w-4 h-4 mr-1.5" />
                      <span className="text-sm font-medium">Deadline: {job.deadline}</span>
                    </div>
                    {job.experience && (
                      <div className="flex items-center px-3 py-1.5 bg-purple-50 text-purple-600 rounded-full">
                        <Briefcase className="w-4 h-4 mr-1.5" />
                        <span className="text-sm font-medium">{job.experience}</span>
                      </div>
                    )}
                  </div>

                  {job.skills && job.skills.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map((skill, index) => (
                          <span 
                            key={index} 
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
                    <div className="text-gray-600 whitespace-pre-line text-sm leading-relaxed">
                      {job.description || "No detailed description available."}
                    </div>
                  </div>
                  
                  {job.email && (
                    <div className="flex items-start">
                      <Mail className="w-5 h-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">Contact Email</p>
                        <a href={`mailto:${job.email}`} className="text-sm text-blue-600 hover:underline">
                          {job.email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Right column - Company info */}
                <div className="md:w-1/3 space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Company Information</h3>
                    <div className="text-sm text-gray-600 whitespace-pre-line">
                      {job.company_profile || "No company information available."}
                    </div>
                  </div>

                  {(job.address || job.tech_park) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Location</h3>
                      <div className="flex items-start text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-400" />
                        <span className="whitespace-pre-line">{job.address || job.tech_park}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-100">
                <a 
                  href={job.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-block bg-blue-600 text-white py-3 px-6 rounded-lg text-center hover:bg-blue-700 transition-all duration-300 shadow-sm hover:shadow font-medium"
                >
                  Apply for this Position
                  <ExternalLink className="inline-block w-4 h-4 ml-2" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Job listing section component that uses the JobCard
const JobListingSection = ({ jobs, isLoading, hasMore, loadMoreJobs }) => {
  return (
    <section className="px-6 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))
          ) : (
            <>
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 animate-pulse h-64"
                  >
                    <div className="p-5">
                      <div className="flex justify-between">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg mb-4"></div>
                        <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/5 mb-4"></div>
                      <div className="mt-8 h-10 bg-gray-200 rounded-lg w-full"></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center animate-fadeIn">
                  <div className="bg-blue-50 p-4 rounded-full mb-4">
                    <SearchX className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No jobs found</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    We couldn't find any jobs matching your current filters. Try adjusting your search criteria.
                  </p>
                </div>
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
  );
};

export default JobListingSection;
