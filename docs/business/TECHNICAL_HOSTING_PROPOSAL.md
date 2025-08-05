# Hosting Proposal: Tonic Music Program Registration System

**Prepared for:** Marin Country Day School
**Date:** August 4, 2025  
**Document Version:** 2.0

---

## Executive Summary

This proposal outlines three hosting options for the Tonic Music Program Registration System. We recommend Google Cloud Platform as the best choice for reliability and integration, with Firebase and Render as cost-effective alternatives.

**Hosting Options:**
- **Best Choice:** Google Cloud Platform - $35-50/month
- **Budget Alternative 1:** Firebase - $15-30/month (serverless)
- **Budget Alternative 2:** Render.com - $25-75/month (always-on)

---

## Current System Overview

The Tonic application is a simple, efficient system that:
- Manages student registration for music programs
- Stores all data in Google Sheets (no database needed)
- Handles low traffic (typically 50-200 users)
- Uses minimal server resources

**Key Requirements:**
- Reliable access during registration periods
- Secure handling of student information
- Easy administration through Google accounts
- Cost-effective for school budget  

---

## Option 1: Google Cloud Platform (RECOMMENDED)

### Why Google Cloud Platform is the Best Choice

**Always Available**
- Your application stays running 24/7 without interruptions
- Instant response times for all users
- No delays during busy registration periods
- Guaranteed uptime for school operations

**Perfect Google Integration**
- Seamless connection to your existing Google Sheets
- Works naturally with Google Workspace accounts
- Administrators can sign in with their school Google accounts
- No additional authentication setup needed
- Takes full advantage of Google's education tools

**Optimized Performance**
- Specially designed to work with Google Sheets API
- Fast data retrieval and updates
- Built-in security and compliance features
- Automatic scaling during high-usage periods

### Cost Breakdown

**Recommended Plan: Cloud Run + Load Balancer**

| What You Get | Monthly Cost |
|--------------|--------------|
| **Cloud Run (512MB, 1 vCPU, min 1 instance)** | $30-40 |
| **Basic monitoring & logging** | $5-10 |
| | |
| **Total Monthly Cost** | **$35-50** |
| **Annual Cost** | **$420-600** |

### What This Means for Your School

- **Reliable:** Parents and staff can always access the system
- **Fast:** Quick loading times and responsive interface
- **Secure:** Enterprise-grade security for student data
- **Professional:** Custom domain (music.yourschool.edu)
- **Scalable:** Handles growth as your program expands

---

## Option 2: Firebase (BUDGET ALTERNATIVE)

### What is Firebase?

Firebase uses "serverless" technology, which means your application "sleeps" when no one is using it and "wakes up" when someone visits. This saves money but comes with a small trade-off.

**How Serverless Works:**
- When busy: Application responds instantly (stays "awake")
- When idle: Application goes to sleep after 15 minutes
- First visitor after sleep: 1-2 second delay to wake up
- Subsequent visitors: Instant response

**Google Integration Benefits:**
- Full Google Workspace integration
- Same Google Sheets connectivity as GCP
- Google account authentication
- All the Google ecosystem advantages

### Cost Breakdown

**Recommended Plan: Firebase Hosting + Cloud Functions**

| What You Get | Monthly Cost |
|--------------|--------------|
| **Firebase Hosting (Spark/Blaze Plan)** | $0-5 |
| **Cloud Functions (up to 125K invocations)** | $10-20 |
| **Firestore database (minimal usage)** | $5-10 |
| | |
| **Total Monthly Cost** | **$15-30** |
| **Annual Cost** | **$180-360** |

### Best For Schools That:
- Want significant cost savings (50-70% less than GCP)
- Can accept occasional 1-2 second delays
- Have moderate usage patterns
- Value Google ecosystem integration

---

## Option 3: Render.com (CURRENT HOSTING)

### What is Render?

Render is a straightforward hosting platform that keeps your application running continuously. It's simple to manage but doesn't have the same Google integration benefits.

**Always-On Hosting:**
- Application runs 24/7 without sleeping
- Instant response times for all users
- No wake-up delays
- Reliable performance during busy periods

**Integration Limitations:**
- Google Sheets connection works but isn't optimized
- Limited Google Workspace integration
- Standard web authentication (not Google-native)
- Manual setup for any Google services

### Cost Breakdown

**Recommended Plans:**

| Service Level | Features | Monthly Cost |
|---------------|----------|--------------|
| **Starter Plan** | 512MB RAM, always-on hosting | $25 |
| **Standard Plan** | 1GB RAM, enhanced performance | $50 |

**Best Choice for Schools: Starter Plan ($25/month)**
- Sufficient resources for current needs
- Always-on reliability
- Room to grow with usage

### Best For Schools That:
- Want simple, always-on hosting
- Have budget constraints
- Don't need advanced Google integration
- Prefer straightforward management

---

## Comparison Summary

| Feature | Google Cloud Platform | Firebase | Render.com |
|---------|----------------------|----------|------------|
| **Always Available** | ✅ Yes | ❌ Sleeps when idle | ✅ Yes |
| **Response Time** | ⚡ Instant | ⚡ Instant (⏱️ 1-2s wake-up) | ⚡ Instant |
| **Google Sheets Integration** | ⭐⭐⭐ Optimized | ⭐⭐⭐ Excellent | ⭐⭐ Works |
| **Google Workspace SSO** | ⭐⭐⭐ Native | ⭐⭐⭐ Native | ⭐ Limited |
| **Monthly Cost** | $35-50 | $15-30 | $25-75 |
| **Annual Cost** | $420-600 | $180-360 | $300-900 |
| **Setup Complexity** | Medium | Simple | Very Simple |
| **Future Growth** | ⭐⭐⭐ Excellent | ⭐⭐⭐ Excellent | ⭐⭐ Good |

## Recommendations by School Priority

### **Priority: Maximum Reliability & Integration**
**Choose Google Cloud Platform**
- Best overall solution for professional school environment
- Always available with instant response times
- Perfect Google Workspace integration
- Worth the investment for reliability

### **Priority: Cost Savings with Good Integration**
**Choose Firebase**
- 50-70% cost savings compared to GCP
- Excellent Google integration
- Acceptable trade-off: occasional 1-2 second delays
- Great for budget-conscious schools

### **Priority: Simple Always-On Hosting**
**Choose Render.com**
- Keep current simple setup
- Always available with instant response
- Lower cost than GCP
- Limited Google integration features

## Final Recommendation

**For a private school with budget for quality infrastructure: Google Cloud Platform**

The combination of always-on reliability, optimized Google integration, and professional infrastructure makes GCP the best long-term investment. The monthly cost of $35-50 provides enterprise-grade hosting that will serve your school well as the music program grows.

**Alternative:** If budget is the primary concern, Firebase offers excellent value at $15-30/month with only minor trade-offs in availability.
