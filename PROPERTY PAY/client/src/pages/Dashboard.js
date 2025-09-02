import React from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI } from '../services/api';
import {
  Building2,
  Users,
  CreditCard,
  Wrench,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Home
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const Dashboard = () => {
  const { user, isLandlord, isPropertyManager, isTenant } = useAuth();

  const { data: dashboardData, isLoading, error } = useQuery(
    'dashboard',
    () => dashboardAPI.getDashboard().then(res => res.data),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
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
        Failed to load dashboard data. Please try again.
      </div>
    );
  }

  const renderTenantDashboard = () => {
    const { activeLease, recentPayments, upcomingPayments, maintenanceRequests, notifications } = dashboardData || {};

    return (
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-blue-100">
            Here's what's happening with your rental
          </p>
        </div>

        {/* Current Lease */}
        {activeLease && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold flex items-center">
                <Home className="h-5 w-5 mr-2" />
                Current Lease
              </h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Property</p>
                  <p className="font-semibold">{activeLease.property_name}</p>
                  <p className="text-sm text-gray-500">{activeLease.unit_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Monthly Rent</p>
                  <p className="font-semibold text-lg">${activeLease.monthly_rent}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Lease End</p>
                  <p className="font-semibold">{new Date(activeLease.end_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-body text-center">
              <CreditCard className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">
                {recentPayments?.filter(p => p.status === 'completed').length || 0}
              </p>
              <p className="text-sm text-gray-600">Payments Made</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body text-center">
              <Wrench className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">
                {maintenanceRequests?.filter(r => r.status === 'open').length || 0}
              </p>
              <p className="text-sm text-gray-600">Open Requests</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body text-center">
              <Bell className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">
                {notifications?.length || 0}
              </p>
              <p className="text-sm text-gray-600">Notifications</p>
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        {recentPayments && recentPayments.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Recent Payments</h2>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {recentPayments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        payment.status === 'completed' ? 'bg-green-500' : 
                        payment.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <p className="font-medium">{payment.payment_type}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${payment.amount}</p>
                      <p className="text-sm text-gray-600 capitalize">{payment.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Payments */}
        {upcomingPayments && upcomingPayments.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Upcoming Payments</h2>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {upcomingPayments.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <p className="font-medium">Rent Payment</p>
                        <p className="text-sm text-gray-600">
                          Due: {new Date(payment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-blue-600">${payment.amount}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLandlordDashboard = () => {
    const { propertiesSummary, unitsSummary, recentPayments, pendingMaintenance, monthlyRevenue } = dashboardData || {};

    return (
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-green-100">
            Manage your properties and track your investments
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-body text-center">
              <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{propertiesSummary?.total_properties || 0}</p>
              <p className="text-sm text-gray-600">Properties</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body text-center">
              <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{unitsSummary?.occupied_units || 0}</p>
              <p className="text-sm text-gray-600">Occupied Units</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body text-center">
              <DollarSign className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">
                ${monthlyRevenue?.[0]?.total?.toLocaleString() || 0}
              </p>
              <p className="text-sm text-gray-600">This Month's Revenue</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body text-center">
              <Wrench className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{pendingMaintenance?.length || 0}</p>
              <p className="text-sm text-gray-600">Pending Maintenance</p>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        {monthlyRevenue && monthlyRevenue.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Monthly Revenue</h2>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyRevenue.reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                  <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent Payments */}
        {recentPayments && recentPayments.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Recent Payments</h2>
            </div>
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Tenant</th>
                      <th className="text-left py-2">Property</th>
                      <th className="text-left py-2">Amount</th>
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.slice(0, 10).map((payment) => (
                      <tr key={payment.id} className="border-b">
                        <td className="py-2">
                          {payment.tenant_first_name} {payment.tenant_last_name}
                        </td>
                        <td className="py-2">{payment.property_name}</td>
                        <td className="py-2 font-semibold">${payment.amount}</td>
                        <td className="py-2">{new Date(payment.payment_date).toLocaleDateString()}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Pending Maintenance */}
        {pendingMaintenance && pendingMaintenance.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Pending Maintenance</h2>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {pendingMaintenance.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        request.priority === 'emergency' ? 'bg-red-500' :
                        request.priority === 'high' ? 'bg-orange-500' :
                        request.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <div>
                        <p className="font-medium">{request.title}</p>
                        <p className="text-sm text-gray-600">
                          {request.property_name} - Unit {request.unit_number}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{request.priority}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          {isTenant && "Track your rent payments and maintenance requests"}
          {isLandlord && "Monitor your properties and rental income"}
          {isPropertyManager && "Manage properties and tenant relationships"}
        </p>
      </div>

      {isTenant && renderTenantDashboard()}
      {(isLandlord || isPropertyManager) && renderLandlordDashboard()}
    </div>
  );
};

export default Dashboard;
