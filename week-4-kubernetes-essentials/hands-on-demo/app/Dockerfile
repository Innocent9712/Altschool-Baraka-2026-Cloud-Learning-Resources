# A tiny web page that shows WHICH Pod served the request, plus a version and
# colour baked in at build time, so load balancing and rolling updates are
# visible in the browser.
#
#   docker build -t demo-web-app:v1 app/
#   docker build -t demo-web-app:v2 --build-arg VERSION=v2 --build-arg COLOR=#7c3aed app/
FROM nginx:1.29-alpine

ARG VERSION=v1
ARG COLOR=#0f766e

COPY index.html /usr/share/nginx/html/index.html
COPY entrypoint.sh /entrypoint.sh

# Bake the version and colour into the page at BUILD time
RUN sed -i "s/{{VERSION}}/${VERSION}/g; s/{{COLOR}}/${COLOR}/g" /usr/share/nginx/html/index.html \
    && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
