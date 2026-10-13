import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../app/store/AppContext.jsx';
import { Card } from '../components/ui/feedback.jsx';
import { Button } from '../components/ui/controls.jsx';

export function NotFoundPage() {
  return (
    <div className="container-x py-16 max-w-md text-center">
      <Card>
        <p className="font-display text-5xl text-navy-900">404</p>
        <p className="p-muted text-sm mt-2">This page doesn&apos;t exist.</p>
        <div className="mt-4 flex gap-2 justify-center">
          <Link to="/"><Button variant="outline" size="sm">Landing</Button></Link>
          <Link to="/home"><Button size="sm">Hub</Button></Link>
        </div>
      </Card>
    </div>
  );
}

// /logout — clears session, redirects to Landing.
export function LogoutPage() {
  const { logout } = useApp();
  const navigate = useNavigate();
  useEffect(() => {
    logout();
    const t = setTimeout(() => navigate('/', { replace: true }), 600);
    return () => clearTimeout(t);
  }, [logout, navigate]);
  return (
    <div className="container-x py-16 max-w-md text-center">
      <Card><p className="font-semibold text-navy-900">Signing you out…</p><p className="text-sm text-slate-500">Redirecting to Landing Page.</p></Card>
    </div>
  );
}
