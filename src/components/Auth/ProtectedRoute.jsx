import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { PageLoader } from '../ui/Skeleton';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, currentAdmin } = useSelector((s) => s.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // token present but admin data not yet hydrated (rare edge case on refresh)
  if (!currentAdmin) {
    return <PageLoader />;
  }

  // support both nested shape (login) and flat shape (some fetchMe responses)
  const role = currentAdmin?.user?.role ?? currentAdmin?.role;
  if (role !== 'admin') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
