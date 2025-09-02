import React from 'react';
import { useQuery } from 'react-query';
import { maintenanceAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Wrench, AlertTriangle, Clock, CheckCircle, User, Building2 } from 'lucide-react';

const Maintenance = () => {
  const { isTenant, isLandlord, isPropertyManager } = useAuth();
  
  const { data: requests, isLoading, error } = useQuery(
    'maintenance',
    () => maintenanceAPI.getAll().then(res => res.data)
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
        Failed to load maintenance requests. Please try again.
      </div>
    );
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'emergency':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'medium':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'low':
        return <Clock className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'emergency':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance Requests</h1>
        <p className="text-gray-600">
          {isTenant ? "Submit and track your maintenance requests" : "Manage maintenance requests and repairs"}
        </p>
      </div>

      {requests && requests.length > 0 ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="card-body text-center">
                <Wrench className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">
                  {requests.filter(r => r.status === 'open').length}
                </p>
                <p className="text-sm text-gray-600">Open Requests</p>
              </div>
            </div>
            
            <div className="card">
              <div className="card-body text-center">
                <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">
                  {requests.filter(r => r.status === 'in_progress').length}
                </p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
            </div>
            
            <div className="card">
              <div className="card-body text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">
                  {requests.filter(r => r.status === 'completed').length}
                </p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
            
            <div className="card">
              <div className="card-body text-center">
                <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">
                  {requests.filter(r => r.priority === 'emergency').length}
                </p>
                <p className="text-sm text-gray-600">Emergency</p>
              </div>
            </div>
          </div>

          {/* Requests List */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">All Requests</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start">
                        {getPriorityIcon(request.priority)}
                        <div className="ml-3">
                          <h3 className="font-semibold text-lg">{request.title}</h3>
                          <p className="text-sm text-gray-600">
                            {request.property_name} - Unit {request.unit_number}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(request.priority)}`}>
                          {request.priority}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{request.description}</p>
                    
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {request.tenant_first_name} {request.tenant_last_name}
                        </div>
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-1" />
                          {request.property_name}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {request.assigned_to && (
                      <div className="mt-3 p-2 bg-blue-50 rounded">
                        <p className="text-sm text-blue-800">
                          Assigned to: {request.assigned_first_name} {request.assigned_last_name}
                        </p>
                      </div>
                    )}
                    
                    {(request.estimated_cost || request.actual_cost) && (
                      <div className="mt-3 flex space-x-4 text-sm">
                        {request.estimated_cost && (
                          <span className="text-gray-600">
                            Estimated: ${request.estimated_cost}
                          </span>
                        )}
                        {request.actual_cost && (
                          <span className="text-gray-600">
                            Actual: ${request.actual_cost}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Wrench className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No maintenance requests</h3>
          <p className="text-gray-600">
            {isTenant 
              ? "You haven't submitted any maintenance requests yet."
              : "No maintenance requests have been submitted."
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
