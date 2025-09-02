import React from 'react';
import { useQuery } from 'react-query';
import { paymentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, DollarSign, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';

const Payments = () => {
  const { isTenant, isLandlord, isPropertyManager } = useAuth();
  
  const { data: payments, isLoading, error } = useQuery(
    'payments',
    () => paymentsAPI.getAll().then(res => res.data)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        Failed to load payments. Please try again.
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-600">
          {isTenant ? "Track your rent payments and payment history" : "Monitor all payment transactions"}
        </p>
      </div>

      {payments && payments.length > 0 ? (
        <div className="space-y-6">
          {/* Payment Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="card-body text-center">
                <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">
                  ${payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">Total Collected</p>
              </div>
            </div>
            
            <div className="card">
              <div className="card-body text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">
                  {payments.filter(p => p.status === 'completed').length}
                </p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
            
            <div className="card">
              <div className="card-body text-center">
                <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">
                  {payments.filter(p => p.status === 'pending').length}
                </p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
            
            <div className="card">
              <div className="card-body text-center">
                <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">
                  {payments.filter(p => p.status === 'failed').length}
                </p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Payment History</h2>
            </div>
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3">Date</th>
                      <th className="text-left py-3">Type</th>
                      <th className="text-left py-3">Amount</th>
                      {!isTenant && <th className="text-left py-3">Tenant</th>}
                      {!isTenant && <th className="text-left py-3">Property</th>}
                      <th className="text-left py-3">Method</th>
                      <th className="text-left py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="capitalize">{payment.payment_type.replace('_', ' ')}</span>
                        </td>
                        <td className="py-3 font-semibold">${payment.amount}</td>
                        {!isTenant && (
                          <td className="py-3">
                            {payment.tenant_first_name} {payment.tenant_last_name}
                          </td>
                        )}
                        {!isTenant && (
                          <td className="py-3">
                            <div>
                              <p className="font-medium">{payment.property_name}</p>
                              <p className="text-sm text-gray-600">Unit {payment.unit_number}</p>
                            </div>
                          </td>
                        )}
                        <td className="py-3">
                          <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center">
                            {getStatusIcon(payment.status)}
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(payment.status)}`}>
                              {payment.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No payments found</h3>
          <p className="text-gray-600">
            {isTenant 
              ? "You haven't made any payments yet."
              : "No payment transactions have been recorded."
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Payments;
