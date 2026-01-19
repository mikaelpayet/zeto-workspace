import React from "react";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ProjectPage from "./pages/ProjectPage";
import LoginPage from "./pages/LoginPage";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import ProfilePage from "./pages/ProfilePage";
import Header from "./components/Header";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Header />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/profile/:tab?" element={<ProfilePage />} />
              <Route path="/" element={<HomePage />} />
              <Route path="/projects" element={<HomePage />} />
              <Route path="/projects/:id/:tab?" element={<ProjectPage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
