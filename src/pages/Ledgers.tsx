import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  BookOpen,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Tag,
  Layers,
  Search,
  X,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  FileText,
} from 'lucide-react';
import { fetchAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { Ledger, VoucherTitle, VoucherType } from '../types';

export const Ledgers: React.FC = () => {
  const toast = useToast();

  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [titles, setTitles] = useState<VoucherTitle[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Expanded ledger IDs for accordion view
  const [expandedLedgerIds, setExpandedLedgerIds] = useState<Set<number>>(new Set());

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Modals
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [editingLedger, setEditingLedger] = useState<Ledger | null>(null);
  const [ledgerForm, setLedgerForm] = useState({ ledger_no: '', ledger_name: '', description: '', is_active: true });

  const [showTitleModal, setShowTitleModal] = useState(false);
  const [editingTitle, setEditingTitle] = useState<VoucherTitle | null>(null);
  const [titleForm, setTitleForm] = useState({
    title_no: '',
    title: '',
    voucher_type: 'EXPENSE' as VoucherType,
    ledger_id: 0,
    description: '',
    is_active: true,
  });

  // Inline Add Ledger while inside Title modal
  const [showInlineLedger, setShowInlineLedger] = useState(false);
  const [inlineLedgerForm, setInlineLedgerForm] = useState({ ledger_no: '', ledger_name: '', description: '' });

  const loadData = async () => {
    setIsLoading(true);
    const [ledgersRes, titlesRes] = await Promise.all([
      fetchAPI<Ledger[]>('/ledgers'),
      fetchAPI<VoucherTitle[]>('/titles'),
    ]);

    if (ledgersRes.success && ledgersRes.data) {
      setLedgers(ledgersRes.data);
    }
    if (titlesRes.success && titlesRes.data) {
      setTitles(titlesRes.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // ─── ACCORDION TOGGLE ────────────────────────────────────────────────────────
  const toggleExpandLedger = (ledgerId: number) => {
    setExpandedLedgerIds((prev) => {
      const next = new Set(prev);
      if (next.has(ledgerId)) {
        next.delete(ledgerId);
      } else {
        next.add(ledgerId);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedLedgerIds.size === ledgers.length) {
      setExpandedLedgerIds(new Set());
    } else {
      setExpandedLedgerIds(new Set(ledgers.map((l) => l.id)));
    }
  };

  // ─── LEDGER ACTIONS ──────────────────────────────────────────────────────────
  const openAddLedger = () => {
    setEditingLedger(null);
    setLedgerForm({
      ledger_no: `LED-${String(ledgers.length + 1).padStart(3, '0')}`,
      ledger_name: '',
      description: '',
      is_active: true,
    });
    setShowLedgerModal(true);
  };

  const openEditLedger = (l: Ledger) => {
    setEditingLedger(l);
    setLedgerForm({
      ledger_no: l.ledger_no,
      ledger_name: l.ledger_name,
      description: l.description || '',
      is_active: l.is_active,
    });
    setShowLedgerModal(true);
  };

  const handleSaveLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerForm.ledger_no.trim() || !ledgerForm.ledger_name.trim()) {
      toast.error('Ledger Number and Ledger Name are mandatory.');
      return;
    }

    if (editingLedger) {
      const res = await fetchAPI<Ledger>(`/ledgers/${editingLedger.id}`, {
        method: 'PUT',
        body: JSON.stringify(ledgerForm),
      });
      if (res.success) {
        toast.success(`Ledger '${ledgerForm.ledger_name}' updated successfully!`);
        setShowLedgerModal(false);
        loadData();
      } else {
        toast.error(res.error?.message || 'Failed to update ledger');
      }
    } else {
      const res = await fetchAPI<Ledger>('/ledgers', {
        method: 'POST',
        body: JSON.stringify(ledgerForm),
      });
      if (res.success) {
        toast.success(`Ledger '${ledgerForm.ledger_name}' created successfully!`);
        setShowLedgerModal(false);
        loadData();
      } else {
        toast.error(res.error?.message || 'Failed to create ledger');
      }
    }
  };

  const handleDeleteLedger = async (l: Ledger) => {
    const associatedCount = titles.filter((t) => t.ledger_id === l.id).length;
    const confirmMsg =
      associatedCount > 0
        ? `Ledger "${l.ledger_name}" (${l.ledger_no}) has ${associatedCount} associated title(s). Deleting it may affect voucher entries. Are you sure you want to delete it?`
        : `Are you sure you want to delete ledger "${l.ledger_name}" (${l.ledger_no})?`;

    if (!confirm(confirmMsg)) return;

    const res = await fetchAPI(`/ledgers/${l.id}`, { method: 'DELETE' });
    if (res.success) {
      toast.success('Ledger deleted successfully');
      loadData();
    } else {
      toast.error(res.error?.message || 'Could not delete ledger');
    }
  };

  // ─── TITLE ACTIONS ───────────────────────────────────────────────────────────
  const openAddTitle = (presetLedgerId?: number) => {
    setEditingTitle(null);
    const targetLedgerId = presetLedgerId || (ledgers.length > 0 ? ledgers[0].id : 0);
    setTitleForm({
      title_no: `TTL-${String(titles.length + 1).padStart(3, '0')}`,
      title: '',
      voucher_type: 'EXPENSE',
      ledger_id: targetLedgerId,
      description: '',
      is_active: true,
    });
    setShowTitleModal(true);
    setShowInlineLedger(false);
  };

  const openEditTitle = (t: VoucherTitle) => {
    setEditingTitle(t);
    setTitleForm({
      title_no: t.title_no,
      title: t.title,
      voucher_type: t.voucher_type,
      ledger_id: t.ledger_id,
      description: t.description || '',
      is_active: t.is_active,
    });
    setShowTitleModal(true);
    setShowInlineLedger(false);
  };

  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleForm.title_no.trim() || !titleForm.title.trim()) {
      toast.error('Title Number and Title Name are mandatory.');
      return;
    }
    if (!titleForm.ledger_id) {
      toast.error('Please assign this title to a Ledger.');
      return;
    }

    if (editingTitle) {
      const res = await fetchAPI<VoucherTitle>(`/titles/${editingTitle.id}`, {
        method: 'PUT',
        body: JSON.stringify(titleForm),
      });
      if (res.success) {
        toast.success(`Title '${titleForm.title}' updated successfully!`);
        setShowTitleModal(false);
        loadData();
      } else {
        toast.error(res.error?.message || 'Failed to update title');
      }
    } else {
      const res = await fetchAPI<VoucherTitle>('/titles', {
        method: 'POST',
        body: JSON.stringify(titleForm),
      });
      if (res.success) {
        toast.success(`Title '${titleForm.title}' created successfully!`);
        setShowTitleModal(false);
        // Automatically expand the ledger to show the new title
        if (titleForm.ledger_id) {
          setExpandedLedgerIds((prev) => new Set([...prev, titleForm.ledger_id]));
        }
        loadData();
      } else {
        toast.error(res.error?.message || 'Failed to create title');
      }
    }
  };

  const handleDeleteTitle = async (t: VoucherTitle) => {
    if (!confirm(`Are you sure you want to delete title "${t.title}" (${t.title_no})?`)) return;

    const res = await fetchAPI(`/titles/${t.id}`, { method: 'DELETE' });
    if (res.success) {
      toast.success('Title deleted successfully');
      loadData();
    } else {
      toast.error(res.error?.message || 'Could not delete title');
    }
  };

  // Inline ledger creation within title modal
  const handleCreateInlineLedger = async () => {
    if (!inlineLedgerForm.ledger_name.trim()) {
      toast.error('Please enter a ledger name');
      return;
    }
    const no = inlineLedgerForm.ledger_no.trim() || `LED-${String(ledgers.length + 1).padStart(3, '0')}`;
    const res = await fetchAPI<Ledger>('/ledgers', {
      method: 'POST',
      body: JSON.stringify({
        ledger_no: no,
        ledger_name: inlineLedgerForm.ledger_name.trim(),
        description: inlineLedgerForm.description,
      }),
    });
    if (res.success && res.data) {
      toast.success(`Ledger '${res.data.ledger_name}' added!`);
      setLedgers((prev) => [...prev, res.data!]);
      setTitleForm((prev) => ({ ...prev, ledger_id: res.data!.id }));
      setShowInlineLedger(false);
      setInlineLedgerForm({ ledger_no: '', ledger_name: '', description: '' });
    } else {
      toast.error(res.error?.message || 'Failed to create ledger');
    }
  };

  const typeBadgeColor: Record<string, string> = {
    INCOME: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    EXPENSE: 'bg-rose-50 text-rose-700 border-rose-200',
    ASSET: 'bg-blue-50 text-blue-700 border-blue-200',
    LIABILITY: 'bg-amber-50 text-amber-700 border-amber-200',
    SELF_TRANSFER: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  // Filter ledgers & their titles
  const query = searchQuery.trim().toLowerCase();

  const filteredLedgers = ledgers.filter((l) => {
    const ledgerMatches =
      l.ledger_name.toLowerCase().includes(query) ||
      l.ledger_no.toLowerCase().includes(query) ||
      (l.description || '').toLowerCase().includes(query);

    // Also check if any associated title matches search and filterType
    const matchingTitles = titles.filter((t) => {
      if (t.ledger_id !== l.id) return false;
      const typeMatches = filterType === 'ALL' || t.voucher_type === filterType;
      const searchMatches =
        query === '' ||
        t.title.toLowerCase().includes(query) ||
        t.title_no.toLowerCase().includes(query) ||
        (t.description || '').toLowerCase().includes(query);
      return typeMatches && searchMatches;
    });

    if (filterType !== 'ALL') {
      return matchingTitles.length > 0;
    }
    return ledgerMatches || matchingTitles.length > 0;
  });

  // Unassigned titles (if any title has an invalid ledger_id)
  const unassignedTitles = titles.filter(
    (t) => !t.ledger_id || !ledgers.some((l) => l.id === t.ledger_id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900">Ledgers & Associated Titles</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Master Ledgers and expand to view, edit, or add associated voucher titles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={toggleExpandAll}>
            <ChevronsUpDown className="w-4 h-4 mr-1 text-slate-500" />
            {expandedLedgerIds.size === ledgers.length && ledgers.length > 0
              ? 'Collapse All'
              : 'Expand All'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => openAddTitle()}>
            <Tag className="w-4 h-4 mr-1 text-emerald-600" /> Add Title
          </Button>
          <Button variant="primary" size="sm" onClick={openAddLedger}>
            <Plus className="w-4 h-4 mr-1" /> Add Ledger
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ledger name, number, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Voucher Types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="ASSET">Asset</option>
            <option value="LIABILITY">Liability</option>
            <option value="SELF_TRANSFER">Self Transfer</option>
          </select>

          <div className="text-xs font-medium text-slate-500 ml-auto flex items-center gap-3">
            <span>
              Total Ledgers: <strong className="text-slate-800">{ledgers.length}</strong>
            </span>
            <span>
              Total Titles: <strong className="text-slate-800">{titles.length}</strong>
            </span>
          </div>
        </div>
      </Card>

      {/* Ledgers with Expandable Titles Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="w-12 px-3 py-3 text-center"></th>
                <th className="px-4 py-3 font-semibold">Ledger No</th>
                <th className="px-4 py-3 font-semibold">Ledger Name</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 text-center font-semibold">Associated Titles</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredLedgers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Loading master ledgers...</span>
                      </div>
                    ) : (
                      'No master ledgers found matching your criteria.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredLedgers.map((ledger) => {
                  const isExpanded = expandedLedgerIds.has(ledger.id);
                  const ledgerTitles = titles.filter((t) => {
                    if (t.ledger_id !== ledger.id) return false;
                    if (filterType !== 'ALL' && t.voucher_type !== filterType) return false;
                    if (query) {
                      const matches =
                        t.title.toLowerCase().includes(query) ||
                        t.title_no.toLowerCase().includes(query) ||
                        (t.description || '').toLowerCase().includes(query);
                      return matches;
                    }
                    return true;
                  });

                  const totalLedgerTitlesCount = titles.filter((t) => t.ledger_id === ledger.id).length;

                  return (
                    <React.Fragment key={ledger.id}>
                      {/* Master Ledger Row */}
                      <tr
                        className={`transition-colors hover:bg-slate-50/90 cursor-pointer ${
                          isExpanded ? 'bg-emerald-50/40 font-medium' : ''
                        }`}
                        onClick={() => toggleExpandLedger(ledger.id)}
                      >
                        {/* Expand/Collapse Toggle Button */}
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandLedger(ledger.id);
                            }}
                            className={`p-1 rounded-md transition-transform hover:bg-slate-200/80 text-slate-500 ${
                              isExpanded ? 'text-emerald-700 bg-emerald-100/70' : ''
                            }`}
                            title={isExpanded ? 'Collapse Titles' : 'Expand Titles'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Ledger No */}
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-700 whitespace-nowrap">
                          {ledger.ledger_no}
                        </td>

                        {/* Ledger Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{ledger.ledger_name}</span>
                            {totalLedgerTitlesCount > 0 && !isExpanded && (
                              <span className="text-[10px] text-slate-400">
                                ({totalLedgerTitlesCount} title{totalLedgerTitlesCount !== 1 ? 's' : ''})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Description */}
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                          {ledger.description || <span className="text-slate-300">—</span>}
                        </td>

                        {/* Sub-Titles Count Badge */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandLedger(ledger.id);
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all ${
                              totalLedgerTitlesCount > 0
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title="Click to view associated titles"
                          >
                            <Tag className="w-3 h-3" />
                            {totalLedgerTitlesCount} {totalLedgerTitlesCount === 1 ? 'Title' : 'Titles'}
                          </button>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              ledger.is_active
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {ledger.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openAddTitle(ledger.id)}
                              title="Add Title to this Ledger"
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Title
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditLedger(ledger)}
                              title="Edit Master Ledger"
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLedger(ledger)}
                              title="Delete Master Ledger"
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Section: Relative Titles Associated with this Ledger */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60 border-t border-b border-emerald-200/60">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                              {/* Sub-header */}
                              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-emerald-600" />
                                  <span className="text-xs font-bold text-slate-800">
                                    Voucher Titles under &ldquo;{ledger.ledger_name}&rdquo; ({ledger.ledger_no})
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    ({ledgerTitles.length} of {totalLedgerTitlesCount} shown)
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  onClick={() => openAddTitle(ledger.id)}
                                  className="text-xs py-1 px-2.5 h-auto"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Title to this Ledger
                                </Button>
                              </div>

                              {/* Titles Sub-table */}
                              {ledgerTitles.length === 0 ? (
                                <div className="p-6 text-center text-slate-400">
                                  <p className="text-xs font-medium mb-2">
                                    {totalLedgerTitlesCount === 0
                                      ? 'No voucher titles have been associated with this ledger yet.'
                                      : 'No titles match your active search/filter.'}
                                  </p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openAddTitle(ledger.id)}
                                    className="text-xs"
                                  >
                                    <Plus className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Add First Title
                                  </Button>
                                </div>
                              ) : (
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                                    <tr>
                                      <th className="px-4 py-2.5 font-semibold">Title No</th>
                                      <th className="px-4 py-2.5 font-semibold">Title Name</th>
                                      <th className="px-4 py-2.5 font-semibold">Voucher Type</th>
                                      <th className="px-4 py-2.5 font-semibold">Description / Notes</th>
                                      <th className="px-4 py-2.5 text-center font-semibold">Status</th>
                                      <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {ledgerTitles.map((title) => (
                                      <tr key={title.id} className="hover:bg-slate-50 transition-colors">
                                        {/* Title No */}
                                        <td className="px-4 py-2.5 font-mono font-semibold text-emerald-700 whitespace-nowrap">
                                          {title.title_no}
                                        </td>

                                        {/* Title Name */}
                                        <td className="px-4 py-2.5 font-bold text-slate-900">
                                          {title.title}
                                        </td>

                                        {/* Voucher Type */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                          <span
                                            className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                                              typeBadgeColor[title.voucher_type] ||
                                              'bg-slate-50 text-slate-700 border-slate-200'
                                            }`}
                                          >
                                            {title.voucher_type.replace('_', ' ')}
                                          </span>
                                        </td>

                                        {/* Description */}
                                        <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate">
                                          {title.description || <span className="text-slate-300">—</span>}
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                          <span
                                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                              title.is_active
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-slate-100 text-slate-600'
                                            }`}
                                          >
                                            {title.is_active ? 'Active' : 'Inactive'}
                                          </span>
                                        </td>

                                        {/* Title Edit / Delete Actions */}
                                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                          <div className="flex items-center justify-end gap-1">
                                            <button
                                              type="button"
                                              onClick={() => openEditTitle(title)}
                                              title="Edit Title"
                                              className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteTitle(title)}
                                              title="Delete Title"
                                              className="p-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}

              {/* Unassigned Titles Section (if any title is missing parent ledger) */}
              {unassignedTitles.length > 0 && (
                <tr className="bg-amber-50/50 border-t-2 border-amber-200">
                  <td colSpan={7} className="px-6 py-4">
                    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-700" />
                          <span className="text-xs font-bold text-amber-900">
                            Unassigned Titles ({unassignedTitles.length})
                          </span>
                          <span className="text-[11px] text-amber-700">
                            (These titles do not currently belong to an active Master Ledger)
                          </span>
                        </div>
                      </div>
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2 font-semibold">Title No</th>
                            <th className="px-4 py-2 font-semibold">Title Name</th>
                            <th className="px-4 py-2 font-semibold">Voucher Type</th>
                            <th className="px-4 py-2 font-semibold">Description</th>
                            <th className="px-4 py-2 text-center font-semibold">Status</th>
                            <th className="px-4 py-2 text-right font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {unassignedTitles.map((title) => (
                            <tr key={title.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-mono font-semibold text-emerald-700">
                                {title.title_no}
                              </td>
                              <td className="px-4 py-2 font-bold text-slate-900">{title.title}</td>
                              <td className="px-4 py-2">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                                    typeBadgeColor[title.voucher_type] ||
                                    'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {title.voucher_type.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-slate-500">{title.description || '—'}</td>
                              <td className="px-4 py-2 text-center">
                                <span
                                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                    title.is_active
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {title.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditTitle(title)}
                                    title="Assign to a Ledger"
                                    className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTitle(title)}
                                    title="Delete Title"
                                    className="p-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── ADD/EDIT MASTER LEDGER MODAL ───────────────────────────────────── */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border-t-4 border-t-emerald-600 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingLedger ? 'Edit Master Ledger' : 'Add New Master Ledger'}
              </h3>
              <button
                type="button"
                onClick={() => setShowLedgerModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLedger} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-600 font-semibold mb-1">Ledger No *</label>
                  <input
                    type="text"
                    required
                    value={ledgerForm.ledger_no}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, ledger_no: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1">Ledger Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Office Administration, Bank Charges"
                    value={ledgerForm.ledger_name}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, ledger_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={ledgerForm.description}
                  onChange={(e) => setLedgerForm({ ...ledgerForm, description: e.target.value })}
                  placeholder="Optional details..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ledger_active"
                  checked={ledgerForm.is_active}
                  onChange={(e) => setLedgerForm({ ...ledgerForm, is_active: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="ledger_active" className="text-slate-700 font-medium">
                  Active Ledger
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowLedgerModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  {editingLedger ? 'Save Changes' : 'Create Ledger'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD/EDIT VOUCHER TITLE MODAL ───────────────────────────────────── */}
      {showTitleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border-t-4 border-t-emerald-600 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingTitle ? 'Edit Voucher Title' : 'Add New Voucher Title'}
              </h3>
              <button
                type="button"
                onClick={() => setShowTitleModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTitle} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Voucher Type *</label>
                  <select
                    value={titleForm.voucher_type}
                    onChange={(e) => setTitleForm({ ...titleForm, voucher_type: e.target.value as VoucherType })}
                    className="w-full px-3 py-2 border rounded-lg font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                    <option value="ASSET">Asset</option>
                    <option value="LIABILITY">Liability</option>
                    <option value="SELF_TRANSFER">Self Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Title Number *</label>
                  <input
                    type="text"
                    required
                    value={titleForm.title_no}
                    onChange={(e) => setTitleForm({ ...titleForm, title_no: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Title Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity Bill, Temple Annadhanam, Staff Salary"
                  value={titleForm.title}
                  onChange={(e) => setTitleForm({ ...titleForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Parent Ledger Selection with inline "+ Add New Ledger" */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-600 font-semibold">Assigned Parent Ledger *</label>
                  <button
                    type="button"
                    onClick={() => setShowInlineLedger(!showInlineLedger)}
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    {showInlineLedger ? 'Cancel New Ledger' : '+ Add New Ledger'}
                  </button>
                </div>

                {showInlineLedger ? (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2 mb-2">
                    <p className="font-bold text-emerald-900 text-[11px]">Create New Ledger On The Fly:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Ledger No (e.g. LED-099)"
                        value={inlineLedgerForm.ledger_no}
                        onChange={(e) => setInlineLedgerForm({ ...inlineLedgerForm, ledger_no: e.target.value })}
                        className="px-2 py-1.5 border rounded bg-white text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Ledger Name *"
                        value={inlineLedgerForm.ledger_name}
                        onChange={(e) => setInlineLedgerForm({ ...inlineLedgerForm, ledger_name: e.target.value })}
                        className="col-span-2 px-2 py-1.5 border rounded bg-white text-xs"
                      />
                    </div>
                    <Button type="button" size="sm" variant="primary" onClick={handleCreateInlineLedger}>
                      Save & Select Ledger
                    </Button>
                  </div>
                ) : (
                  <select
                    value={titleForm.ledger_id}
                    onChange={(e) => setTitleForm({ ...titleForm, ledger_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={0}>-- Select Master Ledger --</option>
                    {ledgers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.ledger_name} ({l.ledger_no})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={titleForm.description}
                  onChange={(e) => setTitleForm({ ...titleForm, description: e.target.value })}
                  placeholder="Optional details..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="title_active"
                  checked={titleForm.is_active}
                  onChange={(e) => setTitleForm({ ...titleForm, is_active: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="title_active" className="text-slate-700 font-medium">
                  Active Title
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowTitleModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  {editingTitle ? 'Save Changes' : 'Create Title'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
