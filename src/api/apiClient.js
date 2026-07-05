import axios from 'axios'

// Generic GET request helper
export const getRequest = async (url, params = {}, headers = {}, config = {}) => {
  try {
    const response = await axios.get(url, {
      params,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      ...config,
    })
    return { data: response.data, success: true }
  } catch (error) {
    return { error, success: false }
  }
}