export const apiUrl =
  process.env.NODE_ENV === 'production'
    ? '/api'
    : `${process.env.REACT_APP_SERVER_URL || 'http://localhost:14723'}/api`;
