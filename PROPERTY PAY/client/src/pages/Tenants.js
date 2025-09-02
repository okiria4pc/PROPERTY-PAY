import React from 'react';
import { useQuery } from 'react-query';
import { tenantsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Users, Mail, Phone, Calendar, Building2 } from 'lucide-react';

const Tenants = () => {
  const { isLandlord, isPropertyManager } = useAuth();
  
  const { data: tenants, isLoading, error } = useQuery(
    'tenants',
    () => tenantsAPI.getAll().then(res => res.data),
    {
      enabled: isLandlord || isPropertyManager,
    }
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
        Failed to load tenants. Please try again.
      </div>
    );
  }

  if (!isLandlord && !isPropertyManager) {
    return (
      <div className="alert alert-error">
        You don't have permission to view this page.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
        <p className="text-gray-600">Manage your tenant relationships</p>
      </div>

      {tenants && tenants.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((tenant) => (
            <div key={tenant.id} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {tenant.first_name} {tenant.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{tenant.active_leases} active lease(s)</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {tenant.email}
                  </div>
                  {tenant.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {tenant.phone}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Joined {new Date(tenant.created_at).toLocaleDateString()}
                  </div>
                  {tenant.properties && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Building2 className="h-4 w-4 mr-2" />
                      {tenant.properties}
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button className="btn btn-outline flex-1">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No tenants found</h3>
          <p className="text-gray-600">
            You don't have any tenants yet. Add properties and create leases to get started.
          </p>
        </div>
      )}
    </div>
  );
};

export default Tenants;
