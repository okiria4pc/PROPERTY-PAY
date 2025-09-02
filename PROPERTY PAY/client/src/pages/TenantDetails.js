import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { tenantsAPI } from '../services/api';
import { Users, Mail, Phone, Calendar, Building2, CreditCard, Wrench } from 'lucide-react';

const TenantDetails = () => {
  const { id } = useParams();
  
  const { data: tenant, isLoading, error } = useQuery(
    ['tenant', id],
    () => tenantsAPI.getById(id).then(res => res.data)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="alert alert-error">
        Tenant not found or failed to load.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {tenant.first_name} {tenant.last_name}
        </h1>
        <p className="text-gray-600">Tenant Details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-body text-center">
              <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {tenant.first_name} {tenant.last_name}
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <Mail className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-600">{tenant.email}</span>
                </div>
                {tenant.phone && (
                  <div className="flex items-center justify-center">
                    <Phone className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-600">{tenant.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-600">
                    Joined {new Date(tenant.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {/* Leases */}
          <div className="card mb-6">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Lease History</h3>
            </div>
            <div className="card-body">
              {tenant.leases && tenant.leases.length > 0 ? (
                <div className="space-y-4">
                  {tenant.leases.map((lease) => (
                    <div key={lease.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{lease.property_name}</h4>
                          <p className="text-sm text-gray-600">Unit {lease.unit_number}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          lease.lease_status === 'active' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {lease.lease_status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Start Date</p>
                          <p className="font-semibold">{new Date(lease.start_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">End Date</p>
                          <p className="font-semibold">{new Date(lease.end_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Monthly Rent</p>
                          <p className="font-semibold">${lease.monthly_rent}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Deposit</p>
                          <p className="font-semibold">${lease.deposit_amount}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No lease history found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="card mb-6">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Recent Payments</h3>
            </div>
            <div className="card-body">
              {tenant.recentPayments && tenant.recentPayments.length > 0 ? (
                <div className="space-y-3">
                  {tenant.recentPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <CreditCard className="h-5 w-5 text-gray-500 mr-3" />
                        <div>
                          <p className="font-medium">{payment.payment_type}</p>
                          <p className="text-sm text-gray-600">
                            {payment.property_name} - Unit {payment.unit_number}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${payment.amount}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No payment history found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Maintenance Requests */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Maintenance Requests</h3>
            </div>
            <div className="card-body">
              {tenant.maintenanceRequests && tenant.maintenanceRequests.length > 0 ? (
                <div className="space-y-3">
                  {tenant.maintenanceRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{request.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          request.priority === 'emergency' ? 'bg-red-100 text-red-800' :
                          request.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          request.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {request.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">
                          {request.property_name} - Unit {request.unit_number}
                        </span>
                        <span className="text-gray-500">
                          {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No maintenance requests found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantDetails;
