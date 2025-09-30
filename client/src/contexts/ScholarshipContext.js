"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const ScholarshipContext = createContext();

export const useScholarships = () => {
  const context = useContext(ScholarshipContext);
  if (!context) {
    throw new Error(
      "useScholarships must be used within a ScholarshipProvider"
    );
  }
  return context;
};

export const ScholarshipProvider = ({ children }) => {
  const [scholarships, setScholarships] = useState([]); // Always initialize as array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchScholarships = useCallback(async () => {
  setLoading(true)
  setError(null)
  try {
    console.log('Fetching scholarships...')
    const response = await axios.get("/api/scholarships", {
      params: {
        status: "All",
        limit: 100,
      },
    })
    
    console.log('API Response:', response.data)
    console.log('Response type:', typeof response.data)
    console.log('Is array?', Array.isArray(response.data))

      // Handle different response formats
      let scholarshipArray = [];

      if (Array.isArray(response.data)) {
        // Direct array response
        scholarshipArray = response.data;
      } else if (response.data && typeof response.data === "object") {
        // Object response - check common property names
        if (Array.isArray(response.data.scholarships)) {
          scholarshipArray = response.data.scholarships;
        } else if (Array.isArray(response.data.data)) {
          scholarshipArray = response.data.data;
        } else if (Array.isArray(response.data.results)) {
          scholarshipArray = response.data.results;
        } else {
          console.warn("Unexpected response format:", response.data);
          scholarshipArray = [];
        }
      } else {
        console.warn("Response is not an object or array:", response.data);
        scholarshipArray = [];
      }

      console.log("Setting scholarships array:", scholarshipArray);
      console.log("Array length:", scholarshipArray.length);

      setScholarships(scholarshipArray);
    } catch (error) {
      console.error("Error fetching scholarships:", error);
      setError(error.response?.data?.message || "Failed to fetch scholarships");
      setScholarships([]); // Ensure it's still an array on error
    } finally {
      setLoading(false);
    }
  }, [])

  const getScholarshipMatches = useCallback(async (userId) => {
    setLoading(true);
    setError(null);
    try {
      let response
      try {
        response = await axios.get(`/api/scholarships/matches/${userId}`)
      } catch (nextError) {
        response = await axios.get(`http://localhost:5000/api/scholarships/matches/${userId}`)
      }

      // Handle response format for matches too
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && Array.isArray(response.data.matches)) {
        return response.data.matches;
      } else if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      return response.data || [];
    } catch (error) {
      setError(error.response?.data?.message || "Failed to get matches");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const applyForScholarship = useCallback(async (scholarshipId) => {
    try {
      const response = await axios.post(
        `/api/scholarships/${scholarshipId}/apply`
      );
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Application failed",
      };
    }
  }, []);

  const createScholarship = useCallback(async (scholarshipData) => {
    try {
      const response = await axios.post("/api/scholarships", scholarshipData);

      // Handle the response format
      const newScholarship = response.data.scholarship || response.data;

      setScholarships((prev) => {
        if (Array.isArray(prev)) {
          return [...prev, newScholarship];
        }
        return [newScholarship];
      });

      return { success: true, scholarship: newScholarship };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to create scholarship",
      };
    }
  }, []);

  const updateScholarship = useCallback(async (id, scholarshipData) => {
    try {
      const response = await axios.put(
        `/api/scholarships/${id}`,
        scholarshipData
      );

      const updatedScholarship = response.data.scholarship || response.data;

      setScholarships((prev) => {
        if (Array.isArray(prev)) {
          return prev.map((s) => (s._id === id ? updatedScholarship : s));
        }
        return [updatedScholarship];
      });

      return { success: true, scholarship: updatedScholarship };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to update scholarship",
      };
    }
  }, []);

  const deleteScholarship = useCallback(async (id) => {
    try {
      await axios.delete(`/api/scholarships/${id}`);

      setScholarships((prev) => {
        if (Array.isArray(prev)) {
          return prev.filter((s) => s._id !== id);
        }
        return [];
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to delete scholarship",
      };
    }
  }, []);

  useEffect(() => {
    fetchScholarships();
  }, []); // Empty dependency array - only run once on mount

  const value = {
    scholarships,
    loading,
    error,
    fetchScholarships,
    getScholarshipMatches,
    applyForScholarship,
    createScholarship,
    updateScholarship,
    deleteScholarship,
  };

  return (
    <ScholarshipContext.Provider value={value}>
      {children}
    </ScholarshipContext.Provider>
  );
};

