# PROPERTY PAY - Property Management Application

A full-stack property management application built with React and Express.js.

## Features

- User authentication and authorization (Landlords, Property Managers, Tenants)
- Property and unit management
- Lease management
- Payment tracking
- Maintenance request system
- Dashboard with analytics

## Tech Stack

- **Frontend**: React, React Router, Styled Components
- **Backend**: Express.js, SQLite
- **Authentication**: JWT tokens
- **Deployment**: Vercel

## Local Development

1. Install dependencies:
   ```bash
   npm run install-all
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. The application will be available at:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

## Deployment on Vercel

This application is configured for deployment on Vercel with the following setup:

### Configuration Files

- `vercel.json`: Vercel deployment configuration
- `api/index.js`: Serverless function entry point
- `.vercelignore`: Files to exclude from deployment

### Database

**Important**: The current setup uses SQLite with an in-memory database for Vercel deployment. This means:

- Data is not persistent between function invocations
- For production use, you should migrate to a cloud database like:
  - PostgreSQL (recommended)
  - MySQL
  - MongoDB
  - PlanetScale
  - Supabase

### Sample Data

The application includes sample data for testing:
- **Landlord**: admin@example.com (password: password)
- **Property Manager**: manager@example.com (password: password)  
- **Tenant**: tenant@example.com (password: password)

### Deployment Steps

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Connect your repository to Vercel
3. Vercel will automatically detect the configuration and deploy

### Environment Variables

Set these environment variables in your Vercel dashboard:

- `NODE_ENV=production`
- `JWT_SECRET=your-secret-key` (for JWT token signing)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh JWT token

### Properties
- `GET /api/properties` - Get all properties
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Tenants
- `GET /api/tenants` - Get all tenants
- `GET /api/tenants/:id` - Get tenant details
- `POST /api/tenants/:id/leases` - Create lease

### Payments
- `GET /api/payments` - Get payments
- `POST /api/payments` - Create payment
- `GET /api/payments/stats/summary` - Payment statistics

### Maintenance
- `GET /api/maintenance` - Get maintenance requests
- `POST /api/maintenance` - Create maintenance request
- `PUT /api/maintenance/:id` - Update maintenance request

### Dashboard
- `GET /api/dashboard` - Get dashboard data

## Troubleshooting

### BODY_NOT_A_STRING_FROM_FUNCTION Error

This error occurs when Vercel expects serverless functions but receives a traditional Express server. The current configuration should resolve this by:

1. Using the `api/index.js` entry point
2. Properly exporting the Express app for Vercel
3. Using in-memory database for serverless environment

### Database Issues

If you encounter database-related errors:

1. Ensure you're using a cloud database for production
2. Check that database connection strings are properly configured
3. Verify that database tables are created correctly

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
