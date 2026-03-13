import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CardPaymentModal from "../components/CardPaymentModal";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Star, Download, User, CreditCard } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showCardPayment, setShowCardPayment] = useState(false);

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API}/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error("Error fetching product", error);
      toast.error("فشل تحميل المنتج");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/products/${id}/reviews`);
      setReviews(response.data);
    } catch (error) {
      console.error("Error fetching reviews", error);
    }
  };

  const handleCardPayment = () => {
    if (!user) {
      toast.error("يجب تسجيل الدخول للشراء");
      navigate("/auth");
      return;
    }
    // Navigate to checkout page (like Salla)
    navigate(`/checkout/${id}`);
  };

  const handlePayTabsPayment = async () => {
    if (!user) {
      toast.error("يجب تسجيل الدخول للشراء");
      navigate("/auth");
      return;
    }

    setPurchasing(true);
    try {
      const origin_url = window.location.origin;
      const response = await axios.post(
        `${API}/payments/paytabs/create`,
        { product_id: id, origin_url },
        { headers: getAuthHeader() }
      );

      if (response.data.redirect_url) {
        if (response.data.demo) {
          toast.info("وضع تجريبي: تحقق من console");
        }
        window.location.href = response.data.redirect_url;
      }
    } catch (error) {
      console.error("Error creating PayTabs payment", error);
      toast.error("فشل إنشاء عملية الدفع");
      setPurchasing(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toast.error("يجب تسجيل الدخول للشراء");
      navigate("/auth");
      return;
    }

    setPurchasing(true);
    try {
      const origin_url = window.location.origin;
      const response = await axios.post(
        `${API}/payments/paytabs/create`,
        { product_id: id, origin_url },
        { headers: getAuthHeader() }
      );

      if (response.data.redirect_url) {
        if (response.data.demo) toast.info("وضع تجريبي: تحقق من console");
        window.location.href = response.data.redirect_url;
      }
    } catch (error) {
      console.error("Error creating checkout", error);
      toast.error("فشل إنشاء عملية الدفع");
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="container mx-auto px-6 py-20 text-center">
          <p className="text-lg text-slate-600">لم يتم العثور على المنتج</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="container mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-2 gap-10" data-testid="product-detail-page">
          {/* Product Image */}
          <div>
            <div className="product-image-container mb-4">
              <img
                src={
                  product.cover_image ||
                  "https://images.unsplash.com/photo-1633783714412-c74668a14d73?w=800"
                }
                alt={product.title}
                className="w-full h-96 object-cover rounded-2xl"
                data-testid="product-detail-image"
              />
            </div>
          </div>

          {/* Product Info */}
          <div>
            <h1
              className="text-4xl font-heading font-bold text-slate-900 mb-4"
              data-testid="product-detail-title"
            >
              {product.title}
            </h1>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">
                  {product.rating?.toFixed(1) || "0.0"}
                </span>
                <span className="text-slate-500">
                  ({product.reviews_count || 0} تقييم)
                </span>
              </div>

              <div className="flex items-center gap-1 text-slate-600">
                <Download className="w-5 h-5" />
                <span>{product.downloads_count || 0} تحميل</span>
              </div>
            </div>

            <p className="text-lg text-slate-700 mb-6 leading-relaxed">
              {product.description}
            </p>

            <Link to={`/seller/${product.seller_id}`}>
              <div className="flex items-center gap-2 mb-6 text-slate-600 hover:text-orange-600 transition-colors">
                <User className="w-5 h-5" />
                <span>البائع: {product.seller_name}</span>
              </div>
            </Link>

            <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-600">السعر</span>
                <div className="text-left">
                  <span
                    className="text-4xl font-bold text-emerald-600 block"
                    data-testid="product-detail-price"
                  >
                    ${product.price}
                  </span>
                  <span className="text-sm text-slate-500">
                    ≈ {(product.price * 3.75).toFixed(2)} ريال
                  </span>
                </div>
              </div>
              
              {/* PayTabs Button (Primary - Saudi) */}
              <Button
                onClick={handlePayTabsPayment}
                disabled={purchasing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full py-6 text-lg mb-3 flex items-center justify-center gap-2"
                data-testid="paytabs-payment-button"
              >
                <span>🇸🇦</span>
                {purchasing ? "جاري المعالجة..." : "ادفع الآن (مدى، فيزا، ماستركارد)"}
              </Button>

              {/* Card Payment Button (Alternative) */}
              <Button
                onClick={handleCardPayment}
                disabled={purchasing}
                variant="outline"
                className="w-full border-2 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-full py-6 text-lg mb-2"
                data-testid="card-payment-button"
              >
                <CreditCard className="w-5 h-5 ml-2" />
                {purchasing ? "جاري المعالجة..." : "دفع بالبطاقة (دولي)"}
              </Button>

              {/* Stripe Checkout Button - Alternative */}
              <Button
                onClick={handlePurchase}
                disabled={purchasing}
                variant="outline"
                className="w-full border-2 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-full py-6 text-lg"
                data-testid="buy-now-button"
              >
                {purchasing ? "جاري المعالجة..." : "الدفع عبر صفحة Stripe"}
              </Button>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-sm text-blue-900">
                  تشمل عمولة نسبه 2.5% من سعر المنتج
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-heading font-bold text-slate-900 mb-6">
            التقييمات
          </h2>

          {reviews.length === 0 ? (
            <p className="text-slate-600">لا توجد تقييمات بعد</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-slate-600" />
                        </div>
                        <span className="font-medium">{review.buyer_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-slate-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-700">{review.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card Payment Modal */}
      {product && (
        <CardPaymentModal
          product={product}
          isOpen={showCardPayment}
          onClose={() => setShowCardPayment(false)}
        />
      )}

      <Footer />
    </div>
  );
}
