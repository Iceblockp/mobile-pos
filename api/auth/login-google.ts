import { useMutation } from '@tanstack/react-query';

const baseUrl = 'http://localhost:3000/api';

// Define the response type based on your API response structure
export interface GoogleLoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    expireDate: string; // ISO date string like "2025-11-12T00:00:00.000Z"
  };
}

export const useApiGoogleLogin = () => {
  return useMutation({
    mutationFn: async (variables: {
      token: string;
    }): Promise<GoogleLoginResponse> => {
      const response = await fetch(`${baseUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: variables.token,
        }),
      });

      if (!response.ok) {
        throw new Error('Google login failed');
      }

      return await response.json();
    },
  });
};
