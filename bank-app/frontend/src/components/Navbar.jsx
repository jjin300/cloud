import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <img src="/favicon.svg" alt="MuriBank" className="brand-logo" />
        MuriBank
      </Link>
      {user && (
        <div className="navbar-right">
          <span className="user-name">{user.name}님</span>
          <button className="link-button" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      )}
    </header>
  );
}
