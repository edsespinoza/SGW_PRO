FROM nginx:alpine

COPY index.html /usr/share/nginx/html/
COPY sgw_pro.html /usr/share/nginx/html/
COPY sw.js /usr/share/nginx/html/
COPY sgw_pro_files /usr/share/nginx/html/sgw_pro_files/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]