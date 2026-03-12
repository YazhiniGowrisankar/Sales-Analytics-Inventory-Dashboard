import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get user data
      authAPI.getProfile()
        .then(response => {
          const userData = response.data.user;
          const role = response.data.role;
          
          // Add role to user object
          const userWithRole = {
            ...userData,
            role: role
          };
          
          setUser(userWithRole);
          setIsAuthenticated(true);
        })
        .catch(error => {
          console.error('Token verification failed:', error);
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials, userType) => {
    try {
      const response = userType === 'admin' 
        ? await authAPI.adminLogin(credentials)
        : await authAPI.customerLogin(credentials);
      
      const data = response.data.data; // Access the nested data object
      const userData = data.admin || data.customer; // Handle both admin and customer responses
      const token = data.token;
      
      if (!userData || !token) {
        throw new Error('Invalid response from server');
      }
      
      // Add role to user object
      const userWithRole = {
        ...userData,
        role: userType
      };
      
      localStorage.setItem('token', token);
      setUser(userWithRole);
      setIsAuthenticated(true);
      
      toast.success(`Welcome back, ${userData.name}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await authAPI.customerSignup(userData);
      const data = response.data.data; // Access the nested data object
      const newUser = data.customer; // Customer signup returns customer object
      const token = data.token;
      
      if (!newUser || !token) {
        throw new Error('Invalid response from server');
      }
      
      // Add role to user object
      const userWithRole = {
        ...newUser,
        role: 'customer'
      };
      
      localStorage.setItem('token', token);
      setUser(userWithRole);
      setIsAuthenticated(true);
      
      toast.success('Account created successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Signup failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
