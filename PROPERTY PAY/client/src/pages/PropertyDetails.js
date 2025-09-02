import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { propertiesAPI } from '../services/api';
import { Building2, MapPin, Users, Home, Plus } from 'lucide-react';

const PropertyDetails = () => {
  const { id } = useParams();
  
  const { data: property, isLoading, error } = useQuery(
    ['property', id],
    () => propertiesAPI.getById(id).then(res => res.data)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="alert alert-error">
        Property not found or failed to load.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
        <p className="text-gray-600">{property.address}, {property.city}, {property.state}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Property Information</h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Property Type</p>
                  <p className="font-semibold capitalize">{property.property_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Units</p>
                  <p className="font-semibold">{property.total_units}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-semibold">{property.address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">City, State ZIP</p>
                  <p className="font-semibold">{property.city}, {property.state} {property.zip_code}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Units Section */}
          <div className="card mt-6">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Units</h2>
                <button className="btn btn-primary btn-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Unit
                </button>
              </div>
            </div>
            <div className="card-body">
              {property.units && property.units.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {property.units.map((unit) => (
                    <div key={unit.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">Unit {unit.unit_number}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          unit.status === 'occupied' ? 'bg-green-100 text-green-800' :
                          unit.status === 'available' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {unit.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>{unit.bedrooms} bed, {unit.bathrooms} bath</p>
                        {unit.square_feet && <p>{unit.square_feet} sq ft</p>}
                        <p className="font-semibold text-green-600">${unit.rent_amount}/month</p>
                      </div>
                      {unit.lease_id && (
                        <div className="mt-2 text-sm">
                          <p className="text-gray-600">Tenant: {unit.tenant_first_name} {unit.tenant_last_name}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No units found for this property.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Quick Stats</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">{property.total_units}</p>
                  <p className="text-sm text-gray-600">Total Units</p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    {property.units?.filter(u => u.status === 'occupied').length || 0}
                  </p>
                  <p className="text-sm text-gray-600">Occupied Units</p>
                </div>
                
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Home className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-600">
                    {property.units?.filter(u => u.status === 'available').length || 0}
                  </p>
                  <p className="text-sm text-gray-600">Available Units</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;
