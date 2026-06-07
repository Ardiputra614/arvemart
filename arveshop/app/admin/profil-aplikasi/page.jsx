"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  SaveIcon,
  XIcon,
  Edit3Icon,
  Building2Icon,
  FileTextIcon,
  ShieldIcon,
  ImageIcon,
  DollarSignIcon,
  WalletIcon,
  AlertCircleIcon,
  UploadIcon,
  Loader2Icon,
  Trash2Icon,
  RefreshCwIcon,
} from "lucide-react";
import api from "@/lib/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_GOLANG_URL || "http://localhost:8080";

const normalizeLogo = (logo) => {
  if (!logo) return "";
  if (logo.startsWith("http")) return logo;
  if (logo.startsWith("data:")) return logo;
  if (logo.startsWith("/uploads/")) return logo;
  return `${API_URL}${logo}`;
};

const ProfileLogo = ({ src: initialSrc, alt }) => {
  const [imgSrc, setImgSrc] = useState(
    normalizeLogo(initialSrc) || "/noimage.png",
  );

  useEffect(() => {
    setImgSrc(normalizeLogo(initialSrc) || "/noimage.png");
  }, [initialSrc]);

  return (
    <Image
      src={imgSrc}
      alt={alt || "logo"}
      width={160}
      height={160}
      unoptimized
      className="object-contain w-full h-full"
      onError={() => setImgSrc("/noimage.png")}
    />
  );
};

export default function ProfilAplikasiPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [syncingSaldo, setSyncingSaldo] = useState(false); // ✅ state sync saldo
  const [formData, setFormData] = useState({
    application_name: "",
    application_fee: "",
    saldo: 0,
    terms_condition: "",
    privacy_policy: "",
    logo: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [logoPreview, setLogoPreview] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/admin/profil-aplikasi");
      let profileData = null;

      if (response.data) {
        if (Array.isArray(response.data) && response.data.length > 0) {
          profileData = response.data[0];
        } else if (typeof response.data === "object" && response.data.id) {
          profileData = response.data;
        } else if (response.data.data) {
          profileData = Array.isArray(response.data.data)
            ? response.data.data[0]
            : response.data.data;
        }
      }

      if (profileData) {
        const logoUrl = normalizeLogo(profileData.logo);
        const normalized = { ...profileData, logo: logoUrl };
        setProfile(normalized);
        setFormData({
          application_name: profileData.application_name || "",
          application_fee: profileData.application_fee || "",
          saldo: profileData.saldo || 0,
          terms_condition: profileData.terms_condition || "",
          privacy_policy: profileData.privacy_policy || "",
          logo: logoUrl,
        });
        setLogoPreview(logoUrl);
      } else {
        setProfile(null);
        setFormData({
          application_name: "",
          application_fee: "",
          saldo: 0,
          terms_condition: "",
          privacy_policy: "",
          logo: "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (error.response?.status === 404) {
        setProfile(null);
      } else {
        toast.error("Gagal memuat data profil aplikasi");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ─── Sync saldo dari Digiflazz ─────────────────────────────────────────────
  const handleSyncSaldo = async () => {
    setSyncingSaldo(true);
    try {
      const response = await api.post("/api/admin/saldo/sync");
      const { saldo, synced_at } = response.data;

      // Update state lokal supaya tampilan langsung berubah tanpa refetch
      setProfile((prev) => (prev ? { ...prev, saldo } : prev));
      setFormData((prev) => ({ ...prev, saldo }));

      toast.success(`Saldo berhasil disinkronkan: ${formatCurrency(saldo)}`, {
        autoClose: 4000,
      });

      console.log("Synced at:", synced_at);
    } catch (error) {
      console.error("Sync saldo error:", error);
      const msg =
        error.response?.data?.error || "Gagal sinkronisasi saldo Digiflazz";
      toast.error(msg);
    } finally {
      setSyncingSaldo(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "saldo" ? parseFloat(value) || 0 : value,
    }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format file harus JPG, PNG, WebP, atau SVG");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
    if (formErrors.logo) setFormErrors((prev) => ({ ...prev, logo: "" }));
  };

  const handleUploadLogo = async () => {
    if (!selectedFile) {
      toast.error("Pilih file terlebih dahulu");
      return;
    }
    setUploading(true);
    try {
      const data = new FormData();
      data.append("logo", selectedFile);
      const response = await api.post("/api/admin/upload", data);
      const logoUrl = response.data.url;
      if (logoUrl) {
        setFormData((prev) => ({ ...prev, logo: logoUrl }));
        toast.success("Logo berhasil diupload");
      }
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error(error.response?.data?.message || "Gagal mengupload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setSelectedFile(null);
    setLogoPreview("");
    setFormData((prev) => ({ ...prev, logo: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.application_name.trim())
      errors.application_name = "Nama aplikasi wajib diisi";
    if (!formData.application_fee.toString().trim())
      errors.application_fee = "Biaya aplikasi wajib diisi";
    else if (isNaN(parseFloat(formData.application_fee)))
      errors.application_fee = "Biaya aplikasi harus berupa angka";
    if (!formData.terms_condition.trim())
      errors.terms_condition = "Syarat & Ketentuan wajib diisi";
    if (!formData.privacy_policy.trim())
      errors.privacy_policy = "Kebijakan Privasi wajib diisi";
    if (!formData.logo.trim()) errors.logo = "Logo aplikasi wajib diupload";
    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Harap periksa kembali form yang wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        application_fee: formData.application_fee.toString(),
        saldo: parseFloat(formData.saldo) || 0,
      };
      let response;
      if (profile?.id) {
        response = await api.put(
          `/api/admin/profil-aplikasi/${profile.id}`,
          payload,
        );
      } else {
        response = await api.post("/api/admin/profil-aplikasi", payload);
      }
      const savedData = response.data?.data || response.data;
      const logoUrl = normalizeLogo(savedData?.logo);
      const normalizedSaved = { ...savedData, logo: logoUrl };
      setProfile(normalizedSaved);
      setLogoPreview(logoUrl);
      toast.success(
        profile?.id
          ? "Profil aplikasi berhasil diperbarui"
          : "Profil aplikasi berhasil dibuat",
      );
      setEditing(false);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Gagal menyimpan data",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        application_name: profile.application_name || "",
        application_fee: profile.application_fee || "",
        saldo: profile.saldo || 0,
        terms_condition: profile.terms_condition || "",
        privacy_policy: profile.privacy_policy || "",
        logo: profile.logo || "",
      });
      setLogoPreview(profile.logo || "");
    }
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setEditing(false);
    setFormErrors({});
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2Icon className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Memuat data profil aplikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Profil Aplikasi
                </h1>
                <p className="text-gray-600 mt-2">
                  Kelola informasi dan pengaturan aplikasi Anda
                </p>
              </div>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit3Icon className="w-5 h-5 mr-2" />
                  {profile ? "Edit Profil" : "Buat Profil"}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <XIcon className="w-5 h-5 mr-2" />
                    Batal
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <>
                        <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="w-5 h-5 mr-2" />
                        Simpan
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Stats Cards ────────────────────────────────────────────────── */}
          {profile && !editing && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Nama Aplikasi</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {profile.application_name}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50">
                    <Building2Icon className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Biaya Aplikasi</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {formatCurrency(parseFloat(profile.application_fee) || 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50">
                    <DollarSignIcon className="w-8 h-8 text-green-500" />
                  </div>
                </div>
              </div>

              {/* ✅ Saldo card dengan tombol Sync Digiflazz */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Saldo Digiflazz</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {formatCurrency(profile.saldo || 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50">
                    <WalletIcon className="w-8 h-8 text-purple-500" />
                  </div>
                </div>

                {/* Tombol sync */}
                <button
                  onClick={handleSyncSaldo}
                  disabled={syncingSaldo}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {syncingSaldo ? (
                    <>
                      <Loader2Icon className="w-4 h-4 animate-spin" />
                      Sinkronisasi...
                    </>
                  ) : (
                    <>
                      <RefreshCwIcon className="w-4 h-4" />
                      Sync Saldo Digiflazz
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Main Content ───────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing
                  ? profile
                    ? "Edit Profil Aplikasi"
                    : "Buat Profil Aplikasi Baru"
                  : "Detail Profil Aplikasi"}
              </h2>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <ImageIcon className="w-4 h-4 inline mr-1" />
                    Logo Aplikasi
                  </label>
                  {editing ? (
                    <div className="space-y-4">
                      {logoPreview && (
                        <div className="relative w-40 h-40 border rounded-lg p-2 bg-gray-50">
                          <ProfileLogo src={logoPreview} alt="Logo preview" />
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <Trash2Icon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center space-x-4">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                        >
                          <UploadIcon className="w-5 h-5 mr-2" />
                          Pilih File
                        </button>
                        {selectedFile && (
                          <button
                            type="button"
                            onClick={handleUploadLogo}
                            disabled={uploading}
                            className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            {uploading ? (
                              <>
                                <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
                                Mengupload...
                              </>
                            ) : (
                              "Upload Logo"
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Format: JPG, PNG, WebP, SVG. Maksimal 2MB
                      </p>
                      <input type="hidden" name="logo" value={formData.logo} />
                      {formErrors.logo && (
                        <p className="text-sm text-red-600">
                          {formErrors.logo}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4">
                      {profile?.logo ? (
                        <div className="relative w-40 h-40 border rounded-lg p-2 bg-gray-50">
                          <ProfileLogo
                            src={profile.logo}
                            alt={profile.application_name || "logo"}
                          />
                        </div>
                      ) : (
                        <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Informasi Dasar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building2Icon className="w-4 h-4 inline mr-1" />
                      Nama Aplikasi
                    </label>
                    {editing ? (
                      <>
                        <input
                          type="text"
                          name="application_name"
                          value={formData.application_name}
                          onChange={handleInputChange}
                          placeholder="Masukkan nama aplikasi"
                          className={`w-full px-3 py-2.5 border rounded-lg ${formErrors.application_name ? "border-red-500" : "border-gray-300"}`}
                        />
                        {formErrors.application_name && (
                          <p className="mt-1 text-sm text-red-600">
                            {formErrors.application_name}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {profile?.application_name || "-"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSignIcon className="w-4 h-4 inline mr-1" />
                      Biaya Aplikasi
                    </label>
                    {editing ? (
                      <>
                        <input
                          type="text"
                          name="application_fee"
                          value={formData.application_fee}
                          onChange={handleInputChange}
                          placeholder="Contoh: 5000"
                          className={`w-full px-3 py-2.5 border rounded-lg ${formErrors.application_fee ? "border-red-500" : "border-gray-300"}`}
                        />
                        {formErrors.application_fee && (
                          <p className="mt-1 text-sm text-red-600">
                            {formErrors.application_fee}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {profile?.application_fee
                          ? formatCurrency(parseFloat(profile.application_fee))
                          : "-"}
                      </p>
                    )}
                  </div>

                  {/* Saldo — read only saat edit, sync hanya dari tombol di card */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <WalletIcon className="w-4 h-4 inline mr-1" />
                      Saldo Digiflazz
                    </label>
                    {editing ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          name="saldo"
                          value={formData.saldo}
                          onChange={handleInputChange}
                          placeholder="0"
                          step="0.01"
                          className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={handleSyncSaldo}
                          disabled={syncingSaldo}
                          title="Sync dari Digiflazz"
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors"
                        >
                          {syncingSaldo ? (
                            <Loader2Icon className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCwIcon className="w-4 h-4" />
                          )}
                          Sync
                        </button>
                      </div>
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {formatCurrency(profile?.saldo || 0)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Terms & Condition */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileTextIcon className="w-4 h-4 inline mr-1" />
                    Syarat & Ketentuan
                  </label>
                  {editing ? (
                    <>
                      <textarea
                        name="terms_condition"
                        value={formData.terms_condition}
                        onChange={handleInputChange}
                        rows="6"
                        placeholder="Masukkan syarat dan ketentuan aplikasi..."
                        className={`w-full px-3 py-2.5 border rounded-lg ${formErrors.terms_condition ? "border-red-500" : "border-gray-300"}`}
                      />
                      {formErrors.terms_condition && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.terms_condition}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {profile?.terms_condition ||
                          "Belum ada syarat dan ketentuan"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Privacy Policy */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <ShieldIcon className="w-4 h-4 inline mr-1" />
                    Kebijakan Privasi
                  </label>
                  {editing ? (
                    <>
                      <textarea
                        name="privacy_policy"
                        value={formData.privacy_policy}
                        onChange={handleInputChange}
                        rows="6"
                        placeholder="Masukkan kebijakan privasi aplikasi..."
                        className={`w-full px-3 py-2.5 border rounded-lg ${formErrors.privacy_policy ? "border-red-500" : "border-gray-300"}`}
                      />
                      {formErrors.privacy_policy && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.privacy_policy}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {profile?.privacy_policy ||
                          "Belum ada kebijakan privasi"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                {profile && !editing && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-sm text-gray-500">Dibuat pada</p>
                      <p className="text-sm font-medium">
                        {new Date(profile.created_at).toLocaleString("id-ID", {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">
                        Terakhir diperbarui
                      </p>
                      <p className="text-sm font-medium">
                        {new Date(profile.updated_at).toLocaleString("id-ID", {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info Message */}
          {!profile && !editing && !loading && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircleIcon className="w-5 h-5 text-yellow-600 mr-3" />
                <div>
                  <p className="text-yellow-800 font-medium">
                    Belum ada data profil
                  </p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Klik tombol &quot;Buat Profil&quot; untuk memulai mengisi
                    data profil aplikasi.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
