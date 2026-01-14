import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { ArrowLeft, Plus, Edit, Search, Trash2, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DNSRecords() {
  const { domain } = useParams();
  const [search, setSearch] = useState('');
  const [selectedRecords, setSelectedRecords] = useState([]);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dns-records', domain],
    queryFn: async () => {
      const res = await api.get(`/api/dns/${domain}`);
      return res.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (recordId) => {
      await api.delete(`/api/dns/${domain}/records/${recordId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dns-records', domain]);
      toast.success('Record deleted');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete record');
    }
  });

  const handleDelete = (recordId, recordName) => {
    if (confirm(`Are you sure you want to delete record "${recordName}"?`)) {
      deleteMutation.mutate(recordId);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRecords(filteredRecords.map(r => r.id));
    } else {
      setSelectedRecords([]);
    }
  };

  const handleSelectRecord = (id, checked) => {
    if (checked) {
      setSelectedRecords([...selectedRecords, id]);
    } else {
      setSelectedRecords(selectedRecords.filter(r => r !== id));
    }
  };

  const records = data?.records || [];
  const filteredRecords = records.filter(r =>
    r.RECORD?.toLowerCase().includes(search.toLowerCase()) ||
    r.VALUE?.toLowerCase().includes(search.toLowerCase()) ||
    r.TYPE?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center text-red-600">
        Failed to load DNS records. Please try again.
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Link to="/dns" className="btn btn-secondary px-3 py-1.5 text-sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <Link to={`/dns/${domain}/add-record`} className="btn btn-secondary px-3 py-1.5 text-sm">
            <PlusCircle className="w-4 h-4 mr-1 text-green-500" />
            Add Record
          </Link>
          <Link to={`/dns/${domain}/edit`} className="btn btn-secondary px-3 py-1.5 text-sm">
            <Edit className="w-4 h-4 mr-1 text-blue-500" />
            Edit DNS Domain
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sort by: <strong>Record</strong></span>
          <select className="input py-1 text-sm w-40">
            <option>Apply to selected</option>
            <option value="suspend">Suspend</option>
            <option value="unsuspend">Unsuspend</option>
            <option value="delete">Delete</option>
          </select>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input py-1 pl-8 text-sm w-40"
            />
          </div>
        </div>
      </div>

      {/* Records table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-border">
              <tr>
                <th className="px-4 py-3 text-left w-8">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase">
                  Record
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase">
                  Priority
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase">
                  TTL
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase">
                  IP or Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-dark-border/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selectedRecords.includes(record.id)}
                      onChange={(e) => handleSelectRecord(record.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/dns/${domain}/edit-record/${record.id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {record.RECORD}
                      </Link>
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/dns/${domain}/edit-record/${record.id}`}
                          className="p-1 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-500"
                          title="Edit Record"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(record.id, record.RECORD)}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium">
                    {record.TYPE}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {record.PRIORITY || ''}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {record.TTL || '14400'}
                  </td>
                  <td className="px-4 py-3 text-sm text-primary-600 break-all max-w-xs">
                    {record.VALUE}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
              {search ? 'No records found matching your search.' : 'No DNS records yet.'}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-sm text-gray-500 dark:text-dark-muted">
        {filteredRecords.length} DNS {filteredRecords.length === 1 ? 'record' : 'records'}
      </div>
    </div>
  );
}
