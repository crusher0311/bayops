import { useState } from 'react';
import { useAuthStore } from '../lib/authStore';
import { useLocation } from 'wouter';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '../components/ui/card';

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, isLoading, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    try {
      await login(username, password);
      setLocation('/');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #1b3a57 100%)' }}>
      <Card className="w-full max-w-md border-[#1b3a57]" style={{ background: 'rgba(13, 27, 42, 0.95)' }}>
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto">
            <img 
              src="/bayops-logo.png" 
              alt="BayOPS" 
              className="h-16 object-contain"
            />
          </div>
          <div>
            <CardDescription className="text-slate-400">
              Sign in to your account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">Username</Label>
              <Input
                id="username"
                data-testid="input-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-[#1b3a57] border-[#2d4a63] text-white placeholder:text-slate-500"
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <Input
                id="password"
                data-testid="input-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#1b3a57] border-[#2d4a63] text-white placeholder:text-slate-500"
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="text-red-400 text-sm bg-red-950/50 border border-red-900 rounded-lg p-3" data-testid="text-error">
                {error}
              </div>
            )}
            <Button
              type="submit"
              data-testid="button-login"
              className="w-full bg-[#1e88e5] hover:bg-[#1976d2] text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-slate-400">
            <p className="mb-2">Demo Credentials:</p>
            <p className="font-mono text-xs">owner / password123</p>
            <p className="font-mono text-xs">advisor / password123</p>
          </div>
          <div className="mt-6 pt-6 border-t border-[#1b3a57] text-center">
            <p className="text-slate-400 text-sm">
              New to BayOPS?{' '}
              <button
                type="button"
                onClick={() => setLocation('/signup')}
                className="text-[#4fc3f7] hover:text-[#81d4fa] font-medium"
                data-testid="link-signup"
              >
                Create your shop account
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
