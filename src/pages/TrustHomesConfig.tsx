import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { fetchAPI, assetUrl } from '../api/client';
import { uploadFile } from '../utils/upload';
import { useToast } from '../context/ToastContext';
import type { TrustHomeConfig } from '../types';
import {
  Building2,
  Upload,
  Copy,
  Check,
  RefreshCw,
  QrCode,
  Heart,
  Baby,
  Users,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  ImageIcon,
} from 'lucide-react';

interface HomeModalForm {
  home_key: string;
  home_name: string;
  home_name_tamil: string;
  upi_id: string;
  qr_code_path: string;
  logo_path: string;
  description: string;
  is_active: boolean;
}

const initialModalForm: HomeModalForm = {
  home_key: '',
  home_name: '',
  home_name_tamil: '',
  upi_id: '',
  qr_code_path: '',
  logo_path: '',
  description: '',
  is_active: true,
};

export const TrustHomesConfig: React.FC = () => {
  const toast = useToast();
  const [homes, setHomes] = useState<TrustHomeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal State for Add & Edit
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingHomeKey, setEditingHomeKey] = useState<string | null>(null);
  const [modalForm, setModalForm] = useState<HomeModalForm>(initialModalForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingModalQR, setIsUploadingModalQR] = useState(false);
  const [isUploadingModalLogo, setIsUploadingModalLogo] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const loadHomes = async () => {
    setIsLoading(true);
    const res = await fetchAPI<TrustHomeConfig[]>('/trust-homes');
    if (res.success && res.data) {
      setHomes(res.data);
    } else {
      toast.error(res.error?.message || 'Failed to load trust homes');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadHomes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingHomeKey(null);
    setModalForm(initialModalForm);
    setShowModal(true);
  };

  const openEditModal = (home: TrustHomeConfig) => {
    setModalMode('edit');
    setEditingHomeKey(home.home_key);
    setModalForm({
      home_key: home.home_key,
      home_name: home.home_name,
      home_name_tamil: home.home_name_tamil || '',
      upi_id: home.upi_id || '',
      qr_code_path: home.qr_code_path || '',
      logo_path: home.logo_path || '',
      description: home.description || '',
      is_active: home.is_active,
    });
    setShowModal(true);
  };

  const handleModalQRUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploadingModalQR(true);
    try {
      const path = await uploadFile(file);
      if (path) {
        setModalForm((prev) => ({ ...prev, qr_code_path: path }));
        toast.success('QR Code image uploaded successfully');
      } else {
        toast.error('Failed to upload QR code. Please try again.');
      }
    } catch {
      toast.error('Error during upload. Please check image format.');
    } finally {
      setIsUploadingModalQR(false);
    }
  };

  const handleModalLogoUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploadingModalLogo(true);
    try {
      const path = await uploadFile(file);
      if (path) {
        setModalForm((prev) => ({ ...prev, logo_path: path }));
        toast.success('Wing/Branch logo uploaded successfully');
      } else {
        toast.error('Failed to upload logo. Please try again.');
      }
    } catch {
      toast.error('Error uploading logo. Check file format.');
    } finally {
      setIsUploadingModalLogo(false);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.home_name.trim()) {
      toast.error('Home Name is required');
      return;
    }

    if (modalMode === 'create' && !modalForm.home_key.trim()) {
      toast.error('Home Identifier Key is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        const payload = {
          home_key: modalForm.home_key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
          home_name: modalForm.home_name.trim(),
          home_name_tamil: modalForm.home_name_tamil.trim(),
          upi_id: modalForm.upi_id.trim(),
          qr_code_path: modalForm.qr_code_path.trim(),
          logo_path: modalForm.logo_path.trim(),
          description: modalForm.description.trim(),
          is_active: modalForm.is_active,
        };

        const res = await fetchAPI<TrustHomeConfig>('/trust-homes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.success) {
          toast.success(`Trust Home "${payload.home_name}" created successfully!`);
          setShowModal(false);
          loadHomes();
        } else {
          toast.error(res.error?.message || 'Failed to create trust home');
        }
      } else {
        const payload = {
          home_name: modalForm.home_name.trim(),
          home_name_tamil: modalForm.home_name_tamil.trim(),
          upi_id: modalForm.upi_id.trim(),
          qr_code_path: modalForm.qr_code_path.trim(),
          logo_path: modalForm.logo_path.trim(),
          description: modalForm.description.trim(),
          is_active: modalForm.is_active,
        };

        const res = await fetchAPI<TrustHomeConfig>(`/trust-homes/${editingHomeKey}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        if (res.success) {
          toast.success(`Trust Home "${payload.home_name}" updated successfully!`);
          setShowModal(false);
          loadHomes();
        } else {
          toast.error(res.error?.message || 'Failed to update trust home');
        }
      }
    } catch {
      toast.error('Unexpected error while saving trust home');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (home: TrustHomeConfig) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${home.home_name}" (${home.home_key})?\n\nIf donations have already been registered under this wing, it will be safely deactivated instead.`
    );
    if (!confirmed) return;

    setDeletingKey(home.home_key);
    try {
      const res = await fetchAPI(`/trust-homes/${home.home_key}`, { method: 'DELETE' });
      if (res.success) {
        toast.success(
          (res.data as { message?: string })?.message || `Trust Home ${home.home_name} processed successfully`
        );
        loadHomes();
      } else {
        toast.error(res.error?.message || 'Failed to delete trust home');
      }
    } catch {
      toast.error('Error occurred while deleting trust home');
    } finally {
      setDeletingKey(null);
    }
  };

  const copyToClipboard = (key: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('UPI ID copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const getHomeVisuals = (key: string) => {
    switch (key) {
      case 'OLD_AGE_HOME':
        return {
          icon: Users,
          color: 'from-amber-500 to-orange-600',
          badge: 'Senior Care Wing',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      case 'CHILDREN_HOME':
        return {
          icon: Baby,
          color: 'from-emerald-500 to-teal-600',
          badge: 'Child Welfare Wing',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      case 'ADOPTION_HOME':
        return {
          icon: Heart,
          color: 'from-purple-500 to-indigo-600',
          badge: 'Adoption Agency Wing',
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        };
      default:
        return {
          icon: Building2,
          color: 'from-blue-600 to-indigo-700',
          badge: 'Trust Entity Wing',
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Trust Homes, Wings & QR Setup
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {homes.length} Configured
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Create, edit, and configure custom trust homes, care wings, and branches with dedicated UPI IDs and QR code images.
              All active wings immediately sync with the mobile donor application for one-tap payments and QR scanning.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadHomes} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Trust Home / Wing
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-sm font-medium">Loading trust home configurations...</p>
        </div>
      ) : homes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Trust Homes Configured</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Click the button below to add your first trust wing with QR code and UPI details.
          </p>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Trust Home / Wing
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {homes.map((home) => {
            const visual = getHomeVisuals(home.home_key);
            const Icon = visual.icon;
            const qrUrl = home.qr_code_path ? assetUrl(home.qr_code_path) : '';

            return (
              <Card
                key={home.home_key}
                className="flex flex-col h-full border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Header Banner */}
                <div className={`p-4 bg-gradient-to-r ${visual.color} text-white`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white">
                      {visual.badge}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        home.is_active ? 'bg-emerald-500/30 text-white' : 'bg-slate-700/50 text-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {home.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-white/30">
                      {home.logo_path ? (
                        <img
                          src={assetUrl(home.logo_path)}
                          alt={home.home_name}
                          className="w-full h-full object-contain bg-white/90 p-1"
                        />
                      ) : (
                        <Icon className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base text-white truncate">{home.home_name}</h3>
                      {home.home_name_tamil && (
                        <p className="text-xs text-white/80 truncate">{home.home_name_tamil}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* QR Code Preview */}
                    <div>
                      <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Donation QR Code
                      </span>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="w-24 h-24 bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {qrUrl ? (
                            <img
                              src={qrUrl}
                              alt={`${home.home_name} QR Code`}
                              className="w-full h-full object-contain p-1"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="text-center p-2 text-slate-400">
                              <QrCode className="w-8 h-8 mx-auto stroke-[1.5]" />
                              <span className="text-[10px] block mt-1">No QR</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-1.5 text-xs">
                          {qrUrl ? (
                            <a
                              href={qrUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> View Full Image
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">No QR uploaded yet</span>
                          )}
                          <p className="text-[11px] text-slate-500">
                            Displayed to donors in app and printed receipts
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* UPI ID */}
                    <div>
                      <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        UPI ID (VPA)
                      </span>
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="font-mono text-xs font-bold text-slate-800 truncate mr-2">
                          {home.upi_id || <span className="text-slate-400 italic">Not Configured</span>}
                        </span>
                        {home.upi_id && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(home.home_key, home.upi_id)}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-white"
                            title="Copy UPI ID"
                          >
                            {copiedKey === home.home_key ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {home.description && (
                      <div>
                        <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Cause Description
                        </span>
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                          {home.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Key: {home.home_key}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(home)}
                        className="px-3"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDelete(home)}
                        disabled={deletingKey === home.home_key}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 disabled:opacity-50"
                        title="Delete or Deactivate Home"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Trust Home Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  {modalMode === 'create' ? 'Create New Trust Home / Wing' : `Edit ${modalForm.home_name}`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure donation wing details, UPI ID and QR code for public donor mobile payments
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form id="home-form" onSubmit={handleModalSubmit} className="overflow-y-auto p-6 space-y-5 flex-1 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Home Identifier Key <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    placeholder="e.g. SPECIAL_WING or HEALTH_CARE"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                    value={modalForm.home_key}
                    onChange={(e) => setModalForm({ ...modalForm, home_key: e.target.value.toUpperCase() })}
                  />
                  <span className="text-[10px] text-slate-400">Unique alphanumeric key (e.g. OLD_AGE_HOME)</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Home / Wing Name (English) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Special Care Old Age Home"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                    value={modalForm.home_name}
                    onChange={(e) => setModalForm({ ...modalForm, home_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Tamil Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. சிறப்பு முதியோர்கள் இல்லம்"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                    value={modalForm.home_name_tamil}
                    onChange={(e) => setModalForm({ ...modalForm, home_name_tamil: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    UPI ID / VPA
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. nesakkaram@sbi or care@upi"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                    value={modalForm.upi_id}
                    onChange={(e) => setModalForm({ ...modalForm, upi_id: e.target.value })}
                  />
                </div>
              </div>

              {/* Logo Upload & Preview */}
              <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Wing / Branch Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {modalForm.logo_path ? (
                      <img
                        src={assetUrl(modalForm.logo_path)}
                        alt="Logo Preview"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center p-1 text-slate-400">
                        <ImageIcon className="w-6 h-6 mx-auto stroke-[1.5]" />
                        <span className="text-[9px] block mt-0.5">No Logo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-sm transition">
                        <Upload className={`w-3.5 h-3.5 ${isUploadingModalLogo ? 'animate-spin' : ''}`} />
                        <span>{isUploadingModalLogo ? 'Uploading...' : modalForm.logo_path ? 'Change Logo' : 'Upload Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingModalLogo}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleModalLogoUpload(file);
                          }}
                        />
                      </label>

                      {modalForm.logo_path && (
                        <button
                          type="button"
                          onClick={() => setModalForm({ ...modalForm, logo_path: '' })}
                          className="text-xs text-rose-600 hover:text-rose-700 ml-2 underline"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Syncs to the donor mobile app home cards and payment screen.
                    </p>
                  </div>
                </div>
              </div>

              {/* QR Code Upload & Preview */}
              <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Donation QR Code Image
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {modalForm.qr_code_path ? (
                      <img
                        src={assetUrl(modalForm.qr_code_path)}
                        alt="QR Code Preview"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <QrCode className="w-8 h-8 mx-auto stroke-[1.5]" />
                        <span className="text-[10px] block mt-1">No QR</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-sm transition">
                      <Upload className={`w-3.5 h-3.5 ${isUploadingModalQR ? 'animate-spin' : ''}`} />
                      <span>{isUploadingModalQR ? 'Uploading...' : modalForm.qr_code_path ? 'Change QR Image' : 'Upload QR Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingModalQR}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleModalQRUpload(file);
                        }}
                      />
                    </label>

                    {modalForm.qr_code_path && (
                      <button
                        type="button"
                        onClick={() => setModalForm({ ...modalForm, qr_code_path: '' })}
                        className="text-xs text-rose-600 hover:text-rose-700 ml-3 underline"
                      >
                        Remove QR
                      </button>
                    )}
                    <p className="text-[11px] text-slate-500">
                      Upload high-resolution square QR code image (PNG, JPG, WebP).
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Cause & Beneficiary Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain who this wing serves and how donations are utilized..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                  value={modalForm.description}
                  onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                />
              </div>

              {/* Active Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="home_is_active_checkbox"
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    checked={modalForm.is_active}
                    onChange={(e) => setModalForm({ ...modalForm, is_active: e.target.checked })}
                  />
                  <div>
                    <label htmlFor="home_is_active_checkbox" className="text-xs font-bold text-slate-800 cursor-pointer block">
                      Active Wing (Visible in Donor App)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      When active, donors can select this wing for donations in the mobile application
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${modalForm.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                  {modalForm.is_active ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 z-10">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="home-form"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Wing' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Helpful Instructions Banner */}
      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Dynamic Multi-Home & Branch Public Donation System:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-emerald-800">
            <li>Admin can freely add new care homes, wings, and specialized projects.</li>
            <li>Each home can have its own independent UPI VPA and donation QR code for bank account segregation.</li>
            <li>Donations made via the mobile app are linked to the selected wing or branch for isolated financial accounts.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
