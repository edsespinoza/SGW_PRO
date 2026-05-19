#!/bin/bash

echo "🚀 Iniciando SGW Pro no Docker..."

# Build e up
docker-compose up --build -d

echo ""
echo "📋 Serviços iniciados:"
echo "   🌐 Frontend:  http://localhost:8080"
echo "   🤖 API Mock:  http://localhost:3000"
echo ""
echo "   Para ver logs: docker-compose logs -f"
echo "   Para parar:    docker-compose down"