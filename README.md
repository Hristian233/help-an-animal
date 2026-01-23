🐾 Animal Map

Animal Map is a community-driven web application that helps people locate and feed homeless animals by sharing their location on an interactive map. Users can add map markers with a short description and an image, making it easier for volunteers and animal lovers to coordinate, bring food and water, and care for animals in public areas.

The app focuses on visibility and coordination and is built with a scalable cloud architecture for fast and reliable image uploads.

🛠️ Tech Stack
Frontend

React + TypeScript

Vite

Google Maps JavaScript API

Hosted on Firebase Hosting

Backend API

Python (FastAPI)

Deployed on Google Cloud Run

Generates IAM-signed URLs for secure image uploads

Image Processing

Google Cloud Functions (2nd gen)

Eventarc (Cloud Storage triggers)

Pillow for image validation, resizing, and format normalization

Two-bucket design:

Inbox bucket for raw uploads

Public bucket for optimized images

Database

PostgreSQL (Cloud SQL)

Cloud & Infrastructure

Google Cloud Platform (GCP)

Cloud Storage

IAM & Service Accounts

Environment-aware configuration (local vs production)
