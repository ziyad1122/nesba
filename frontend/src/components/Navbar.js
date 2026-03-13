import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { User, ShoppingBag, LayoutDashboard, LogOut, Store } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 glass-effect border-b border-slate-200">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-heading font-bold text-slate-900">
              نسبتي
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/products">
              <Button variant="ghost" data-testid="nav-products-link">
                المنتجات
              </Button>
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    data-testid="user-menu-trigger"
                  >
                    <User className="w-4 h-4" />
                    <span>{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {user.role === "seller" && (
                    <DropdownMenuItem
                      onClick={() => navigate("/dashboard/seller")}
                      data-testid="seller-dashboard-link"
                    >
                      <LayoutDashboard className="w-4 h-4 ml-2" />
                      لوحة التحكم
                    </DropdownMenuItem>
                  )}
                  {user.role === "admin" && (
                    <DropdownMenuItem
                      onClick={() => navigate("/dashboard/admin")}
                      data-testid="admin-dashboard-link"
                    >
                      <LayoutDashboard className="w-4 h-4 ml-2" />
                      لوحة الإدارة
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => navigate("/my-purchases")}
                    data-testid="my-purchases-link"
                  >
                    <ShoppingBag className="w-4 h-4 ml-2" />
                    مشترياتي
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    data-testid="logout-button"
                  >
                    <LogOut className="w-4 h-4 ml-2" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6"
                  data-testid="login-button"
                >
                  تسجيل الدخول
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
