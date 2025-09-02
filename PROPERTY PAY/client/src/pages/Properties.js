import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { propertiesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Plus, MapPin, Users, DollarSign, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const Properties = () => {
  const { isLandlord, isPropertyManager } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    propertyType: 'apartment',
    totalUnits: 1,
  });

  const { data: properties, isLoading, refetch } = useQuery(
    'properties',
    () => propertiesAPI.getAll().then(res => res.data)
  );

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await propertiesAPI.create(formData);
      toast.success('Property created successfully!');
      setShowAddForm(false);
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        propertyType: 'apartment',
        totalUnits: 1,
      });
      refetch();
    } catch (error) {
      toast.error('Failed to create property');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600">Manage your rental properties</p>
        </div>
        {(isLandlord || isPropertyManager) && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Property
          </button>
        )}
      </div>

      {/* Add Property Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Property</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Property Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label className="form-label">Address</label>
                <input
                  type="text"
                  name="address"
                  className="form-input"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    name="city"
                    className="form-input"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    name="state"
                    className="form-input"
                    value={formData.state}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="form-label">ZIP Code</label>
                <input
                  type="text"
                  name="zipCode"
                  className="form-input"
                  value={formData.zipCode}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label className="form-label">Property Type</label>
                <select
                  name="propertyType"
                  className="form-select"
                  value={formData.propertyType}
                  onChange={handleChange}
                >
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="condo">Condo</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
              
              <div>
                <label className="form-label">Total Units</label>
                <input
                  type="number"
                  name="totalUnits"
                  className="form-input"
                  value={formData.totalUnits}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>
              
              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary flex-1">
                  Create Property
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Properties Grid */}
      {properties && properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <div key={property.id} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <Building2 className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <h3 className="font-semibold text-lg">{property.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{property.property_type}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {property.address}, {property.city}, {property.state} {property.zip_code}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-sm text-gray-600">Total Units</p>
                    <p className="font-semibold">{property.total_units}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Users className="h-5 w-5 text-green-600 mx-auto mb-1" />
                    <p className="text-sm text-gray-600">Occupied</p>
                    <p className="font-semibold">{property.occupied_units || 0}</p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Link
                    to={`/properties/${property.id}`}
                    className="btn btn-outline flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No properties found</h3>
          <p className="text-gray-600 mb-4">
            {(isLandlord || isPropertyManager) 
              ? "Get started by adding your first property"
              : "No properties are available at the moment"
            }
          </p>
          {(isLandlord || isPropertyManager) && (
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Property
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Properties;
