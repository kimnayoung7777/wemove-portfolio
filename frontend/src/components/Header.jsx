import { Link, useLocation, useNavigate } from "react-router-dom";
import defaultUserImage from "../assets/image/Default-user.png";
import { useAuth } from "../contexts/AuthContext";
import NotificationButton from "./NotificationButton";
import HeaderClock from "./HeaderClock";
import WeMoveLogo from "./WeMoveLogo";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isAdminPage = location.pathname.startsWith("/admin");
  const profileImage =
    typeof user?.profileImage === "string" && user.profileImage.trim()
      ? user.profileImage.trim()
      : defaultUserImage;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleAdminSectionMove = (section) => {
    navigate(`/admin#${section}`);
    window.setTimeout(() => {
      document.getElementById(section)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const userNavItems = [
    { to: "/meetings", label: "모임 찾기" },
    { to: "/meetings/new", label: "모임 생성" },
    { to: "/mypage", label: "마이페이지" },
    ...(isAdmin ? [{ to: "/admin", label: "관리자" }] : []),
  ];

  const adminNavItems = [
    { label: "홈", action: () => navigate("/") },
    { label: "회원 관리", action: () => handleAdminSectionMove("members") },
    { label: "모임 관리", action: () => handleAdminSectionMove("meetings") },
    { label: "신고 내역", action: () => handleAdminSectionMove("reports") },
    { label: "운동 종목", action: () => handleAdminSectionMove("sports") },
  ];

  return (
    <header className="header">
      <div className="inner">
        <Link to="/" className="logo">
          <WeMoveLogo tone="dark" size="md" />
        </Link>

        <nav className="main-nav">
          {isAdminPage
            ? adminNavItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="main-nav-button"
                  onClick={item.action}
                >
                  {item.label}
                </button>
              ))
            : userNavItems.map((item) => (
                <Link key={item.to} to={item.to}>
                  {item.label}
                </Link>
              ))}
        </nav>

        <div className="header-actions">
          <HeaderClock />
          {loading ? null : user ? (
            <>
              <NotificationButton />
              <Link to="/mypage" className="header-user-info">
                <img
                  src={profileImage}
                  alt={user.nickname ? `${user.nickname} 프로필` : "기본 프로필"}
                  className="header-user-avatar"
                />
                <span className="header-user-name">{user.nickname || user.loginId}</span>
              </Link>
              <button
                type="button"
                className="header-signup"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="header-login">
                로그인
              </Link>
              <Link to="/signup" className="header-signup">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
