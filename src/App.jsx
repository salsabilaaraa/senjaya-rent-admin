import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

// Helper to format number to Rupiah string (e.g., "1.200.000")
const formatNumberWithDots = (value) => {
  if (value === 0 || value === "" || value === undefined || value === null) return "";
  const numberString = value.toString().replace(/[^0-9]/g, "");
  return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Helper to parse formatted string back to raw number
const parseDotsToNumber = (value) => {
  if (!value) return 0;
  return parseInt(value.toString().replace(/[^0-9]/g, "")) || 0;
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    category: "MPV",
    type: "",
    image: "",
    seats: 7,
    transmission: "Manual",
    price: 0,
    mesin: "",
    headUnit: "",
    isAvailable: true,
    is_best_seller: false
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  // Notification State
  const [notification, setNotification] = useState(null);

  // Check login state on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch cars from Supabase
  useEffect(() => {
    if (isLoggedIn) {
      fetchCars();
    }
  }, [isLoggedIn]);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const fetchCars = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCars(data || []);
    } catch (error) {
      console.error("Error fetching cars:", error.message);
      showNotification("Gagal mengambil data mobil: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;

      setIsLoggedIn(true);
      showNotification("Login Admin Berhasil!");
    } catch (err) {
      setLoginError("Login gagal: " + (err.message || "Email atau password salah."));
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err.message);
    }
    setIsLoggedIn(false);
    setEmail("");
    setPassword("");
  };

  const handleToggleAvailability = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from("cars")
        .update({ isAvailable: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setCars(cars.map(car => car.id === id ? { ...car, isAvailable: !currentStatus } : car));
      showNotification("Status ketersediaan berhasil diperbarui!");
    } catch (error) {
      showNotification("Gagal memperbarui status: " + error.message, "error");
    }
  };

  const handleDeleteCar = async (id, name) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus mobil ${name}?`)) return;

    try {
      const { error } = await supabase
        .from("cars")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setCars(cars.filter(car => car.id !== id));
      showNotification(`Mobil ${name} berhasil dihapus!`);
    } catch (error) {
      showNotification("Gagal menghapus mobil: " + error.message, "error");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const openAddModal = () => {
    setEditingCar(null);
    setImageFile(null);
    setImagePreview("");
    setFormData({
      name: "",
      category: "MPV",
      type: "",
      image: "",
      seats: 7,
      transmission: "Manual",
      price: 0,
      mesin: "",
      headUnit: "",
      isAvailable: true,
      is_best_seller: false
    });
    setModalOpen(true);
  };

  const openEditModal = (car) => {
    setEditingCar(car);
    setImageFile(null);
    setImagePreview(car.image || "");
    setFormData({
      name: car.name,
      category: car.category,
      type: car.type,
      image: car.image,
      seats: car.seats,
      transmission: car.transmission,
      price: car.price || car.price24h,
      mesin: car.specs?.mesin || "",
      headUnit: car.specs?.headUnit || "",
      isAvailable: car.isAvailable,
      is_best_seller: car.is_best_seller || false
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    let imageUrl = formData.image;

    if (imageFile) {
      try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `cars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("car-images")
          .upload(filePath, imageFile, { upsert: true });

        if (uploadError) {
          throw new Error("Gagal mengunggah gambar ke Supabase Storage. Pastikan bucket 'car-images' telah dibuat dengan akses publik.");
        }

        const { data: publicUrlData } = supabase.storage
          .from("car-images")
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      } catch (err) {
        showNotification(err.message, "error");
        return;
      }
    }

    const carPayload = {
      name: formData.name,
      category: formData.category,
      type: formData.type,
      image: imageUrl || "/cars/default.png",
      seats: Number(formData.seats),
      transmission: formData.transmission,
      price12h: Number(formData.price), // Backwards compatibility
      price24h: Number(formData.price), // Backwards compatibility
      price: Number(formData.price),
      specs: {
        mesin: formData.mesin,
        headUnit: formData.headUnit
      },
      isAvailable: formData.isAvailable,
      is_best_seller: formData.is_best_seller
    };

    try {
      if (editingCar) {
        // UPDATE Operation
        const { error } = await supabase
          .from("cars")
          .update(carPayload)
          .eq("id", editingCar.id);

        if (error) throw error;
        showNotification("Mobil berhasil diperbarui!");
      } else {
        // CREATE Operation
        const { error } = await supabase
          .from("cars")
          .insert([carPayload]);

        if (error) throw error;
        showNotification("Mobil baru berhasil ditambahkan!");
      }

      setModalOpen(false);
      fetchCars();
    } catch (error) {
      showNotification("Gagal menyimpan data: " + error.message, "error");
    }
  };

  // Format currency
  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(number);
  };

  const handleBackToHome = () => {
    const adminUrl = window.location.origin;
    let websiteUrl = "https://senja-jaya-rent.vercel.app"; // Default production fallback

    if (import.meta.env.VITE_WEBSITE_URL) {
      websiteUrl = import.meta.env.VITE_WEBSITE_URL;
    } else if (adminUrl.includes("localhost")) {
      websiteUrl = "https://senja-jaya-rent.vercel.app"; // Always redirect to production site even locally, as requested
    } else if (adminUrl.includes("-admin")) {
      websiteUrl = adminUrl.replace("-admin", ""); // Auto detect Vercel production
    }

    window.open(websiteUrl, "_blank");
  };

  // Metrics calculation
  const totalCars = cars.length;
  const availableCars = cars.filter(car => car.isAvailable).length;
  const rentedCars = totalCars - availableCars;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans text-on-background">
        {/* Decorative background glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-surface-container-high rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-fixed/30 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Login Card */}
        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-level-2 p-8 z-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-2">Portal Admin Senja Jaya Rent</h1>
            <p className="text-on-surface-variant text-sm">Masukkan email dan kata sandi admin resmi Anda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-2">Email Admin</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/80 text-[22px]">mail</span>
                <input
                  type="email"
                  required
                  placeholder="admin@senjajayarent.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface border border-outline-variant/60 focus:border-secondary focus:ring-1 focus:ring-secondary rounded-xl py-3 pl-11 pr-4 text-on-surface placeholder-on-surface-variant/55 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-2">Kata Sandi</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/80 text-[22px]">lock</span>
                <input
                  type="password"
                  required
                  placeholder="Masukkan kata sandi Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface border border-outline-variant/60 focus:border-secondary focus:ring-1 focus:ring-secondary rounded-xl py-3 pl-11 pr-4 text-on-surface placeholder-on-surface-variant/55 outline-none transition-all"
                />
              </div>
              {loginError && <p className="text-error text-xs mt-2.5 flex items-center gap-1 font-semibold">{loginError}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-on-primary font-semibold py-3.5 rounded-xl shadow-level-1 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Masuk Portal Admin
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-4 rounded-xl shadow-level-2 flex items-center gap-3 border transition-all animate-bounce ${notification.type === "error"
            ? "bg-red-50 border-red-200 text-red-800"
            : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}>
          <span className="material-symbols-outlined text-[24px]">
            {notification.type === "error" ? "error" : "check_circle"}
          </span>
          <span className="font-semibold text-sm">{notification.message}</span>
        </div>
      )}

      {/* Header (Premium Navy Header with Golden Accents matching User Website) */}
      <header className="bg-primary border-b border-outline-variant/10 sticky top-0 z-20 text-on-primary shadow-level-1">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-lg text-on-secondary">S</div>
            <div>
              <h1 className="text-lg font-bold text-on-primary leading-none mb-1">Senja Jaya Rent</h1>
              <p className="text-[10px] text-secondary-fixed font-bold tracking-widest uppercase">Dashboard Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToHome}
              className="bg-surface-variant/10 hover:bg-surface-variant/20 text-on-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 border border-outline-variant/10"
            >
              <span className="material-symbols-outlined text-[18px]">public</span>
              Lihat Website
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-[1400px] w-full mx-auto px-6 py-8">
        {/* Metrics Row (Light Slate Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 flex items-center justify-between shadow-level-1">
            <div>
              <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-1.5">Total Armada Mobil</p>
              <h3 className="text-3xl font-extrabold text-on-surface">{totalCars}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-surface-variant text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">directions_car</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 flex items-center justify-between shadow-level-1">
            <div>
              <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-1.5">Mobil Tersedia</p>
              <h3 className="text-3xl font-extrabold text-emerald-600">{availableCars}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">check_circle</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 flex items-center justify-between shadow-level-1">
            <div>
              <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-1.5">Mobil Sedang Disewa</p>
              <h3 className="text-3xl font-extrabold text-amber-600">{rentedCars}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">pending_actions</span>
            </div>
          </div>
        </div>

        {/* Database List Card */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-level-2 overflow-hidden">
          <div className="p-6 border-b border-outline-variant/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-on-surface">Kelola Katalog Mobil</h2>
              <p className="text-on-surface-variant text-xs mt-1">Tambah, edit, hapus, atau ganti status ketersediaan armada secara instan</p>
            </div>
            <button
              onClick={openAddModal}
              className="bg-primary hover:bg-primary/90 text-on-primary px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-level-1 flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Tambah Mobil Baru
            </button>
          </div>

          {loading ? (
            <div className="py-24 text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-on-surface-variant text-sm">Menghubungkan ke database Supabase...</p>
            </div>
          ) : cars.length === 0 ? (
            <div className="py-20 text-center px-4">
              <span className="material-symbols-outlined text-[64px] text-on-surface-variant/40 mb-4">directions_car</span>
              <h3 className="text-lg font-bold text-on-surface mb-1">Belum Ada Data Mobil</h3>
              <p className="text-on-surface-variant text-sm max-w-md mx-auto mb-6">Silakan tambahkan mobil baru untuk mengisi katalog.</p>
              <button
                onClick={openAddModal}
                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer"
              >
                Buat Mobil Pertama Anda
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant/30 text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Mobil</th>
                    <th className="py-4 px-6">Kategori / Tipe</th>
                    <th className="py-4 px-6">Transmisi / Kursi</th>
                    <th className="py-4 px-6 text-center">Ketersediaan</th>
                    <th className="py-4 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {cars.map((car) => (
                    <tr key={car.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-10 rounded bg-surface-variant overflow-hidden border border-outline-variant/30 flex items-center justify-center flex-shrink-0">
                            <img
                              src={car.image}
                              alt={car.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=150&q=80";
                              }}
                            />
                          </div>
                          <span className="font-bold text-on-surface text-sm sm:text-base">{car.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-on-surface-variant text-sm">
                        <span className="inline-block bg-surface-variant text-on-surface text-[11px] font-bold px-2.5 py-0.5 rounded-full mr-2">{car.category}</span>
                        <span className="text-xs text-on-surface-variant">{car.type}</span>
                      </td>
                      <td className="py-4 px-6 text-on-surface-variant text-xs font-medium">
                        <span className="block text-on-surface">{car.transmission}</span>
                        <span>{car.seats} Kursi</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleToggleAvailability(car.id, car.isAvailable)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${car.isAvailable
                              ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                            }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${car.isAvailable ? "bg-emerald-500" : "bg-red-500"} animate-pulse`}></span>
                          {car.isAvailable ? "Tersedia" : "Tidak Tersedia"}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2.5">
                          <button
                            onClick={() => openEditModal(car)}
                            className="w-9 h-9 rounded-lg bg-surface-variant/80 hover:bg-surface-variant text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer border border-outline-variant/10"
                            title="Edit Mobil"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCar(car.id, car.name)}
                            className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="Hapus Mobil"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* CRUD Form Modal Overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl w-full max-w-2xl shadow-level-2 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-outline-variant/20 flex justify-between items-center">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">directions_car</span>
                {editingCar ? `Edit Data: ${editingCar.name}` : "Tambah Armada Mobil Baru"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface w-8 h-8 rounded-full hover:bg-surface-variant/50 flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-2">Nama Kendaraan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Toyota Avanza Veloz"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-surface border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary rounded-xl py-2.5 px-4 text-on-surface text-sm outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-2">Kategori Mobil</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-surface border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary rounded-xl py-2.5 px-4 text-on-surface text-sm outline-none transition-all cursor-pointer"
                  >
                    <option value="City Car">City Car</option>
                    <option value="MPV">MPV</option>
                    <option value="Premium">Premium</option>
                    <option value="Rombongan">Rombongan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-2">Tipe / Deskripsi Singkat</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Family MPV atau Premium SUV"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-surface border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary rounded-xl py-2.5 px-4 text-on-surface text-sm outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-2">Transmisi</label>
                  <select
                    value={formData.transmission}
                    onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                    className="w-full bg-surface border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary rounded-xl py-2.5 px-4 text-on-surface text-sm outline-none transition-all cursor-pointer"
                  >
                    <option value="Matic">Matic</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-2">Jumlah Kursi (Seats)</label>
                  <input
                    type="number"
                    required
                    min="2"
                    max="60"
                    placeholder="Contoh: 7"
                    value={formData.seats === 0 || !formData.seats ? "" : formData.seats}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, seats: val === "" ? "" : parseInt(val) || 0 });
                    }}
                    className="w-full bg-surface border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary rounded-xl py-2.5 px-4 text-on-surface text-sm outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-2">Gambar Mobil</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full bg-surface border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary rounded-xl py-2 px-4 text-on-surface text-sm outline-none transition-all file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-variant file:text-on-surface file:cursor-pointer cursor-pointer"
                  />
                  {imagePreview && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="w-16 h-10 rounded border border-outline-variant/30 overflow-hidden flex items-center justify-center bg-surface-variant">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] text-on-surface-variant">Pratinjau Gambar</span>
                    </div>
                  )}
                </div>


              </div>

              {/* Specs Sub-sections */}
              <div className="border-t border-outline-variant/20 pt-5">
                <h4 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[20px] text-secondary">tune</span>
                  Spesifikasi Teknis (Detail Detail Mobil)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-2">Spesifikasi Mesin</label>
                    <textarea
                      placeholder="Contoh: 1.500cc (2NR-VE) 4-Silinder Dual VVT-i"
                      value={formData.mesin}
                      onChange={(e) => setFormData({ ...formData, mesin: e.target.value })}
                      className="w-full bg-surface border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary rounded-xl py-2.5 px-4 text-on-surface text-sm outline-none transition-all h-20 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-2">Spesifikasi Head Unit / Interior</label>
                    <textarea
                      placeholder="Contoh: 9 inci Floating Touchscreen Audio"
                      value={formData.headUnit}
                      onChange={(e) => setFormData({ ...formData, headUnit: e.target.value })}
                      className="w-full bg-surface border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary rounded-xl py-2.5 px-4 text-on-surface text-sm outline-none transition-all h-20 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-outline-variant/20 pt-5 flex items-center">
                <input
                  id="car-is-available"
                  type="checkbox"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="w-5 h-5 rounded text-secondary focus:ring-secondary bg-surface border border-outline-variant cursor-pointer"
                />
                <label htmlFor="car-is-available" className="ml-3 text-sm text-on-surface font-medium cursor-pointer select-none">
                  Atur Status Aktif / Tersedia Sekarang
                </label>
              </div>

              <div className="border-t border-outline-variant/20 pt-5 flex items-center">
                <input
                  id="car-is-best-seller"
                  type="checkbox"
                  checked={formData.is_best_seller}
                  onChange={(e) => setFormData({ ...formData, is_best_seller: e.target.checked })}
                  className="w-5 h-5 rounded text-secondary focus:ring-secondary bg-surface border border-outline-variant cursor-pointer"
                />
                <label htmlFor="car-is-best-seller" className="ml-3 text-sm text-on-surface font-medium cursor-pointer select-none">
                  Tandai sebagai Best Seller
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="border-t border-outline-variant/20 pt-5 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-surface-variant/70 hover:bg-surface-variant text-on-surface-variant px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-on-primary px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-level-1 cursor-pointer"
                >
                  {editingCar ? "Simpan Perubahan" : "Tambahkan Armada"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
