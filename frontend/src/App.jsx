import { useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import AppModal from "./components/AppModal";
import GlobalMeetingChat from "./components/GlobalMeetingChat";
import Header from "./components/Header";
import NotificationSocket from "./components/NotificationSocket";
import { useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ToastProvider } from "./contexts/ToastContext";
import AdminPage from "./pages/AdminPage";
import ActivityPage from "./pages/ActivityPage";
import FindAccountPage from "./pages/FindAccountPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MeetingDetailPage from "./pages/MeetingDetailPage";
import MeetingListPage from "./pages/MeetingListPage";
import MeetingManagePage from "./pages/MeetingManagePage";
import MyPage from "./pages/MyPage";
import ReviewPage from "./pages/ReviewPage";
import SearchPage from "./pages/SearchPage";
import SignupPage from "./pages/SignupPage";
import MeetingCreatePage from "./pages/MeetingCreatePage.jsx";
import MeetingEditPage from "./pages/MeetingEditPage.jsx";

const ACCESS_WARNING = {
  title: "접근 권한이 없습니다",
  adminLogin: "관리자 페이지는 관리자 계정으로 로그인해야 볼 수 있습니다.",
  adminBlocked: "일반 회원은 관리자 페이지로 이동할 수 없습니다.",
  userBlocked:
    "이 메뉴는 일반 회원 전용입니다. 관리자 계정은 관리자 페이지에서 이용해주세요.",
};

function RouteWarningModal({ title, description, redirectTo }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const handleConfirm = () => {
    setOpen(false);
    navigate(redirectTo, { replace: true });
  };

  return (
    <AppModal
      open={open}
      title={title}
      description={description}
      confirmText="확인"
      onConfirm={handleConfirm}
      onClose={handleConfirm}
      hideCancel
    />
  );
}

function AdminOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <RouteWarningModal
        title={ACCESS_WARNING.title}
        description={ACCESS_WARNING.adminLogin}
        redirectTo="/login"
      />
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <RouteWarningModal
        title={ACCESS_WARNING.title}
        description={ACCESS_WARNING.adminBlocked}
        redirectTo="/"
      />
    );
  }

  return children;
}

function UserOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user?.role === "ADMIN") {
    return (
      <RouteWarningModal
        title={ACCESS_WARNING.title}
        description={ACCESS_WARNING.userBlocked}
        redirectTo="/admin"
      />
    );
  }

  return children;
}

function LayoutRoutes() {
  const { pathname } = useLocation();
  const isDashboardRoute =
    pathname === "/" ||
    pathname === "/meetings" ||
    pathname === "/search" ||
    pathname === "/activity" ||
    pathname === "/mypage";

  return (
    <>
      {!isDashboardRoute && <Header />}
      <main className={isDashboardRoute ? "app-main home-main" : "app-main"}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/meetings" element={<MeetingListPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/meetings/:meetingId" element={<MeetingDetailPage />} />
          <Route
            path="/meetings/new"
            element={
              <UserOnlyRoute>
                <MeetingCreatePage />
              </UserOnlyRoute>
            }
          />
          <Route
            path="/meetings/:meetingId/edit"
            element={
              <UserOnlyRoute>
                <MeetingEditPage />
              </UserOnlyRoute>
            }
          />
          <Route
            path="/meetings/:meetingId/manage"
            element={
              <UserOnlyRoute>
                <MeetingManagePage />
              </UserOnlyRoute>
            }
          />
          <Route
            path="/activity"
            element={
              <UserOnlyRoute>
                <ActivityPage />
              </UserOnlyRoute>
            }
          />
          <Route
            path="/mypage"
            element={
              <UserOnlyRoute>
                <MyPage />
              </UserOnlyRoute>
            }
          />
          <Route
            path="/meetings/:meetingId/reviews"
            element={
              <UserOnlyRoute>
                <ReviewPage />
              </UserOnlyRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminOnlyRoute>
                <AdminPage />
              </AdminOnlyRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <NotificationProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/find-account" element={<FindAccountPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<LayoutRoutes />} />
        </Routes>
        <NotificationSocket />
        <GlobalMeetingChat />
      </NotificationProvider>
    </ToastProvider>
  );
}
