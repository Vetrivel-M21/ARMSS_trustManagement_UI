import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, Search, UserCheck, Trash2, Eye, Upload, Check, Download, Phone, Mail, MapPin, Cake, Calendar, Users, FileText } from 'lucide-react';
import { fetchAPI, assetUrl } from '../api/client';
import { useToast } from '../context/ToastContext';
import { uploadFile, downloadFile, fetchAuthedBlobUrl } from '../utils/upload';
import { useAuthedAsset } from '../hooks/useAuthedAsset';
import type { Donor } from '../types';

const calculateAge = (dob: string): number | null => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

const fmtDate = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-GB');
};

const isImageFile = (path?: string | null) => !!path && /\.(jpe?g|png|webp)$/i.test(path);
const docExtension = (path?: string | null) => (path ? path.slice(path.lastIndexOf('.')) : '');

const RELATIONSHIP_STYLES: Record<string, string> = {
  SON: 'bg-blue-50 text-blue-700 border-blue-200',
  DAUGHTER: 'bg-pink-50 text-pink-700 border-pink-200',
  SPOUSE: 'bg-purple-50 text-purple-700 border-purple-200',
  PARENT: 'bg-amber-50 text-amber-700 border-amber-200',
};

/** One KYC document row (Aadhaar/PAN). A separate component so `useAuthedAsset`
 * can be called once per document — hooks can't be called inside a .map(). */
const KycDocRow: React.FC<{
  label: string;
  number: string;
  docPath: string;
  slug: string;
  donorCode: string;
  onDownload: (path: string, filename: string) => void;
}> = ({ label, number, docPath, slug, donorCode, onDownload }) => {
  const thumbUrl = useAuthedAsset(docPath && isImageFile(docPath) ? assetUrl(docPath) : null);

  const handlePreview = async () => {
    const url = thumbUrl || (await fetchAuthedBlobUrl(assetUrl(docPath)));
    if (url) window.open(url, '_blank');
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/60">
      <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0 flex items-center justify-center">
        {docPath ? (
          isImageFile(docPath) ? (
            thumbUrl ? <img src={thumbUrl} alt={`${label} document`} className="w-full h-full object-cover" /> : <FileText className="w-6 h-6 text-slate-300" />
          ) : (
            <FileText className="w-6 h-6 text-slate-400" />
          )
        ) : (
          <FileText className="w-6 h-6 text-slate-200" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="font-mono font-semibold text-slate-900 text-sm truncate">{number || 'Not provided'}</p>
      </div>
      {docPath ? (
        <div className="flex gap-1.5 shrink-0">
          <Button variant="outline" size="sm" onClick={handlePreview}>
            <Eye className="w-3.5 h-3.5 mr-1" />Preview
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDownload(docPath, `${donorCode}-${slug}${docExtension(docPath)}`)}>
            <Download className="w-3.5 h-3.5 mr-1" />Download
          </Button>
        </div>
      ) : (
        <span className="text-[11px] text-slate-400 italic shrink-0">No document on file</span>
      )}
    </div>
  );
};

export const Donors: React.FC = () => {
  const toast = useToast();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const selectedDonorPhotoUrl = useAuthedAsset(selectedDonor?.photo_path ? assetUrl(selectedDonor.photo_path) : null);

  const [formData, setFormData] = useState({
    full_name: '',
    father_name: '',
    phone: '',
    email: '',
    address_line: '',
    city: '',
    state: '',
    pincode: '',
    date_of_birth: '',
    anniversary_date: '',
    marital_status: 'MARRIED',
    aadhaar_number: '',
    aadhaar_doc_path: '',
    pan_number: '',
    pan_doc_path: '',
    photo_path: '',
    notes: '',
  });

  const [familyMembers, setFamilyMembers] = useState<Array<{ full_name: string; relationship: string; date_of_birth: string; notes: string }>>([]);
  const [uploadingField, setUploadingField] = useState<'photo_path' | 'aadhaar_doc_path' | 'pan_doc_path' | null>(null);

  const handleDocUpload = async (field: 'photo_path' | 'aadhaar_doc_path' | 'pan_doc_path', file: File | null) => {
    if (!file) return;
    setUploadingField(field);
    const path = await uploadFile(file);
    setUploadingField(null);
    if (path) {
      setFormData((prev) => ({ ...prev, [field]: path }));
    } else {
      toast.error('Failed to upload file. Please try again.');
    }
  };

  const handleDownload = async (path: string, filename: string) => {
    try {
      await downloadFile(assetUrl(path), filename);
    } catch {
      toast.error('Failed to download file. Please try again.');
    }
  };

  const loadDonors = async () => {
    setIsLoading(true);
    const res = await fetchAPI<Donor[]>(`/donors?search=${encodeURIComponent(search)}`);
    if (res.success && res.data) {
      setDonors(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDonors();
  }, [search]);

  const addFamilyMemberRow = () => {
    setFamilyMembers([...familyMembers, { full_name: '', relationship: 'SON', date_of_birth: '', notes: '' }]);
  };

  const removeFamilyMemberRow = (idx: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== idx));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      family_members: familyMembers,
    };
    const res = await fetchAPI<Donor>('/donors', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success) {
      setShowAddModal(false);
      setFormData({
        full_name: '',
        father_name: '',
        phone: '',
        email: '',
        address_line: '',
        city: '',
        state: '',
        pincode: '',
        date_of_birth: '',
        anniversary_date: '',
        marital_status: 'MARRIED',
        aadhaar_number: '',
        aadhaar_doc_path: '',
        pan_number: '',
        pan_doc_path: '',
        photo_path: '',
        notes: '',
      });
      setFamilyMembers([]);
      loadDonors();
      toast.success('Donor profile saved.');
    } else {
      toast.error(res.error?.message || 'Failed to save donor profile');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Donor Directory & Profile Registry</h2>
          <p className="text-xs text-slate-500">Manage donor profiles, Aadhaar/PAN records, marital status, and children DOBs</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add New Donor
        </Button>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search donor by name, phone, email, donor code or city..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Donor Code</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Aadhaar / PAN</th>
                <th className="px-4 py-3">Family Members</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {donors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                    {isLoading ? 'Loading donors...' : 'No donor profiles found'}
                  </td>
                </tr>
              ) : (
                donors.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-700">{d.donor_code}</td>
                    <td className="px-4 py-3 font-medium">{d.full_name}</td>
                    <td className="px-4 py-3">{d.phone}</td>
                    <td className="px-4 py-3">{d.city || 'N/A'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {d.aadhaar_number ? `Aadhaar: ${d.aadhaar_number}` : ''}
                      {d.pan_number ? ` | PAN: ${d.pan_number}` : ''}
                      {!d.aadhaar_number && !d.pan_number && '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                        {d.family_members ? `${d.family_members.length} members` : '0'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedDonor(d)}>
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              Register Complete Donor Profile
            </h3>

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Father's Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    title="10-digit mobile number"
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Marital Status</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={formData.marital_status}
                    onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                  >
                    <option value="MARRIED">Married</option>
                    <option value="SINGLE">Single</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={formData.address_line}
                  onChange={(e) => setFormData({ ...formData, address_line: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    title="6-digit pincode"
                    placeholder="6-digit pincode"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                  {formData.date_of_birth && calculateAge(formData.date_of_birth) !== null && (
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">Age: {calculateAge(formData.date_of_birth)} years</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Anniversary Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    value={formData.anniversary_date}
                    onChange={(e) => setFormData({ ...formData, anniversary_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar Number</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={12}
                      pattern="[0-9]{12}"
                      title="12-digit Aadhaar number"
                      placeholder="12-digit Aadhaar"
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                      value={formData.aadhaar_number}
                      onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number</label>
                    <input
                      type="text"
                      maxLength={10}
                      pattern="[A-Z]{5}[0-9]{4}[A-Z]"
                      title="Format: ABCDE1234F"
                      placeholder="10-digit PAN"
                      className="w-full px-3 py-2 border rounded-lg bg-white uppercase"
                      value={formData.pan_number}
                      onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Photo</label>
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg bg-white text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50">
                      {uploadingField === 'photo_path' ? 'Uploading...' : formData.photo_path ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Uploaded</> : <><Upload className="w-3.5 h-3.5" /> Upload</>}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDocUpload('photo_path', e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar Document</label>
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg bg-white text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50">
                      {uploadingField === 'aadhaar_doc_path' ? 'Uploading...' : formData.aadhaar_doc_path ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Uploaded</> : <><Upload className="w-3.5 h-3.5" /> Upload</>}
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleDocUpload('aadhaar_doc_path', e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Document</label>
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg bg-white text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50">
                      {uploadingField === 'pan_doc_path' ? 'Uploading...' : formData.pan_doc_path ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Uploaded</> : <><Upload className="w-3.5 h-3.5" /> Upload</>}
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleDocUpload('pan_doc_path', e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {/* Children & Family Members */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Children & Family DOB Details</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addFamilyMemberRow}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Family Member
                  </Button>
                </div>

                {familyMembers.map((fm, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
                    <input
                      type="text"
                      placeholder="Name"
                      required
                      className="flex-1 px-2 py-1 border rounded text-xs"
                      value={fm.full_name}
                      onChange={(e) => {
                        const updated = [...familyMembers];
                        updated[idx].full_name = e.target.value;
                        setFamilyMembers(updated);
                      }}
                    />
                    <select
                      className="px-2 py-1 border rounded text-xs"
                      value={fm.relationship}
                      onChange={(e) => {
                        const updated = [...familyMembers];
                        updated[idx].relationship = e.target.value;
                        setFamilyMembers(updated);
                      }}
                    >
                      <option value="SON">Son</option>
                      <option value="DAUGHTER">Daughter</option>
                      <option value="SPOUSE">Spouse</option>
                      <option value="PARENT">Parent</option>
                    </select>
                    <input
                      type="date"
                      required
                      className="px-2 py-1 border rounded text-xs"
                      value={fm.date_of_birth}
                      onChange={(e) => {
                        const updated = [...familyMembers];
                        updated[idx].date_of_birth = e.target.value;
                        setFamilyMembers(updated);
                      }}
                    />
                    <button type="button" onClick={() => removeFamilyMemberRow(idx)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Save Donor Profile</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDonor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div className="flex items-center gap-4">
                {selectedDonorPhotoUrl ? (
                  <img src={selectedDonorPhotoUrl} alt={selectedDonor.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-emerald-100 shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold shrink-0">
                    {selectedDonor.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-emerald-700 font-bold">{selectedDonor.donor_code}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide ${
                        selectedDonor.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-300'
                      }`}
                    >
                      {selectedDonor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">{selectedDonor.full_name}</h3>
                  {selectedDonor.created_at && <p className="text-[11px] text-slate-400 mt-0.5">Registered on {fmtDate(selectedDonor.created_at)}</p>}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedDonor(null)}>Close</Button>
            </div>

            {/* Contact & Identity */}
            <Card title="Contact & Identity">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Father's Name</span>
                  <span className="font-medium text-slate-900">{selectedDonor.father_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</span>
                  <span className="font-medium text-slate-900">{selectedDonor.phone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</span>
                  <span className="font-medium text-slate-900">{selectedDonor.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Marital Status</span>
                  <span
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase ${
                      selectedDonor.marital_status === 'MARRIED' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {selectedDonor.marital_status || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5"><Cake className="w-3.5 h-3.5" /> Date of Birth</span>
                  <span className="font-medium text-slate-900">
                    {selectedDonor.date_of_birth ? fmtDate(selectedDonor.date_of_birth) : 'N/A'}
                    {selectedDonor.date_of_birth && calculateAge(selectedDonor.date_of_birth) !== null && (
                      <span className="text-emerald-600 font-semibold ml-1">({calculateAge(selectedDonor.date_of_birth)} yrs)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Anniversary</span>
                  <span className="font-medium text-slate-900">{selectedDonor.anniversary_date ? fmtDate(selectedDonor.anniversary_date) : 'N/A'}</span>
                </div>
              </div>
            </Card>

            {/* Address */}
            <Card title="Address">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                <div className="col-span-2 flex justify-between items-start gap-3">
                  <span className="text-slate-500 flex items-center gap-1.5 shrink-0"><MapPin className="w-3.5 h-3.5" /> Address</span>
                  <span className="font-medium text-slate-900 text-right">{selectedDonor.address_line || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">City</span>
                  <span className="font-medium text-slate-900">{selectedDonor.city || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">State</span>
                  <span className="font-medium text-slate-900">{selectedDonor.state || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pincode</span>
                  <span className="font-medium text-slate-900">{selectedDonor.pincode || 'N/A'}</span>
                </div>
              </div>
            </Card>

            {/* KYC Documents */}
            <Card title="KYC Documents">
              <div className="space-y-3">
                <KycDocRow
                  label="Aadhaar Number"
                  number={selectedDonor.aadhaar_number}
                  docPath={selectedDonor.aadhaar_doc_path}
                  slug="aadhaar"
                  donorCode={selectedDonor.donor_code}
                  onDownload={handleDownload}
                />
                <KycDocRow
                  label="PAN Number"
                  number={selectedDonor.pan_number}
                  docPath={selectedDonor.pan_doc_path}
                  slug="pan"
                  donorCode={selectedDonor.donor_code}
                  onDownload={handleDownload}
                />
              </div>
            </Card>

            {/* Family Members */}
            {selectedDonor.family_members && selectedDonor.family_members.length > 0 && (
              <Card title="Family Members & Children">
                <div className="space-y-1.5">
                  {selectedDonor.family_members.map((fm, idx) => (
                    <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{fm.full_name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${RELATIONSHIP_STYLES[fm.relationship] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
                        >
                          {fm.relationship}
                        </span>
                      </div>
                      <span className="font-mono text-slate-600">DOB: {fmtDate(fm.date_of_birth)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Notes */}
            {selectedDonor.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-900">
                <strong>Notes:</strong> {selectedDonor.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
