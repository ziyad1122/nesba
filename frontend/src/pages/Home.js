import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import { Button } from "../components/ui/button";
import { ArrowLeft, TrendingUp, Users, Shield } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setFeaturedProducts(response.data.slice(0, 6));
    } catch (error) {
      console.error("Error fetching products", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section py-20 md:py-32" data-testid="hero-section">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-heading font-bold text-slate-900 mb-6 animate-fade-in">
              سوق رقمي للمنتجات الرقمية
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed">
              ابدأ بيع منتجاتك الرقمية بسهولة. نحن نأخذ <span className="gradient-text font-bold">2.5%</span> فقط من كل عملية بيع
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?tab=register&role=seller">
                <Button
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                  data-testid="start-selling-button"
                >
                  ابدأ البيع الآن
                  <ArrowLeft className="w-5 h-5 mr-2 rtl:rotate-180" />
                </Button>
              </Link>
              <Link to="/products">
                <Button
                  variant="outline"
                  className="border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white rounded-full px-8 py-6 text-lg transition-all hover:-translate-y-1"
                  data-testid="browse-products-button"
                >
                  تصفح المنتجات
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 card-hover bg-slate-50 rounded-2xl">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-2">
                عمولة منخفضة
              </h3>
              <p className="text-slate-600">
                نأخذ 2.5% فقط من كل عملية بيع - أقل عمولة في السوق
              </p>
            </div>

            <div className="text-center p-6 card-hover bg-slate-50 rounded-2xl">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-2">
                سهل الاستخدام
              </h3>
              <p className="text-slate-600">
                سجل وابدأ البيع في دقائق بدون تعقيدات
              </p>
            </div>

            <div className="text-center p-6 card-hover bg-slate-50 rounded-2xl">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-2">
                آمن وموثوق
              </h3>
              <p className="text-slate-600">
                دفع آمن عبر Stripe وحماية لبياناتك
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {!loading && featuredProducts.length > 0 && (
        <section className="py-20" data-testid="featured-products-section">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-900">
                منتجات مميزة
              </h2>
              <Link to="/products">
                <Button variant="ghost" className="text-orange-600">
                  عرض الكل
                  <ArrowLeft className="w-4 h-4 mr-2 rtl:rotate-180" />
                </Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
