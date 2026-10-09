# LeadCMS API + admin UI in one image. The backend serves the admin SPA from wwwroot,
# so the admin is built with an empty CORE_API (same-origin API calls).
ARG LEADCMS_VERSION=1.5.155-pre
ARG ADMIN_REF=3faac237da44a5b833a5e02d181ef38970b747a4

FROM node:24-alpine AS admin
ARG ADMIN_REF
WORKDIR /src
ADD https://github.com/LeadCMS/leadcms.admin/archive/${ADMIN_REF}.tar.gz /tmp/admin.tar.gz
RUN tar -xzf /tmp/admin.tar.gz --strip-components=1 && rm /tmp/admin.tar.gz
RUN npm ci --ignore-scripts --no-audit --no-fund
RUN CORE_API= VERSION="${ADMIN_REF}" npm run build

FROM leadcms/core:${LEADCMS_VERSION}
COPY --from=admin /src/dist /app/wwwroot
