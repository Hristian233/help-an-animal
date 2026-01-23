<h1>🐾 Animal Map</h1>

Animal Map is a community-driven web application that helps people locate and feed homeless animals by sharing their location on an interactive map. Users can add map markers with a short description and an image, making it easier for volunteers and animal lovers to coordinate, bring food and water, and care for animals in public areas.

The app focuses on visibility and coordination and is built with a scalable cloud architecture for fast and reliable image uploads.

<h2>🛠️ Tech Stack</h2>
<h3>Frontend</h3>

    React + TypeScript

    Vite

    Google Maps JavaScript API

    Hosted on Firebase Hosting

<h3>Backend API</h3>

    Python (FastAPI)

    Deployed on Google Cloud Run

    Generates IAM-signed URLs for secure image uploads

<h3>Image Processing</h3>

Google Cloud Functions (2nd gen)

Eventarc (Cloud Storage triggers)

Pillow for image validation, resizing, and format normalization

Two-bucket design:

Inbox bucket for raw uploads

Public bucket for optimized images

<h3>Database</h3>

    PostgreSQL (Cloud SQL)

<h3>Cloud & Infrastructure</h3>

    Google Cloud Platform (GCP)

    Cloud Storage

    IAM & Service Accounts

    Environment-aware configuration (local vs production)
