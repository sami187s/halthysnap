// Simple crash reporting utility

// Local crash reporter that just logs to console
export const localCrashReporter = {
  captureException: (error) => {
  },
  
  captureMessage: (message, level = 'info') => {
  },
  
  addBreadcrumb: (breadcrumb) => {
  },
  
  setContext: (key, value) => {
  },

  captureError: (error, context = {}) => {
  }
};

// Simplified initialization
export const initializeSentry = () => {
  return true;
};

// Function to manually capture errors
export const captureError = (error, context = {}) => {
};

// Function to capture messages
export const captureMessage = (message, level = 'info') => {
};

// Function to add breadcrumbs
export const addBreadcrumb = (breadcrumb) => {
};

// Set user context
export const setUserContext = (user) => {
};

// Set extra context
export const setExtraContext = (key, value) => {
};

export default {
  initializeSentry,
  captureError,
  captureMessage,
  addBreadcrumb,
  setUserContext,
  setExtraContext,
  localCrashReporter
};
