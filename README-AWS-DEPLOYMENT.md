# Anna Logica Enterprise AWS Deployment

## 🏢 Infraestructura Empresarial

Esta es la migración completa de Anna Logica a AWS para uso empresarial e institucional.

### 📋 Requisitos Previos

1. **AWS CLI configurado**
   ```bash
   aws configure
   ```

2. **Docker instalado** (para construir FFmpeg layer)

3. **Variables de entorno:**
   ```bash
   # Configura tu API key de Gemini
   set GEMINI_API_KEY=tu_api_key_aqui
   ```

### 🚀 Deployment Rápido

**Ejecuta el script de deployment:**
```bash
deploy.bat
```

Este script automáticamente:
- ✅ Construye FFmpeg layer usando Docker
- ✅ Instala dependencias de Lambda
- ✅ Despliega toda la infraestructura AWS
- ✅ Configura VPC, EFS, S3, API Gateway

### 🏗️ Arquitectura Empresarial

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │    │  API Gateway    │    │ Lambda Functions │
│    (Global)     │────▶│   (Regional)    │────▶│  (Serverless)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐             │
                       │       EFS       │◄────────────┘
                       │ (File Storage)  │
                       └─────────────────┘
                                │
                       ┌─────────────────┐
                       │       S3        │
                       │ (Long-term)     │
                       └─────────────────┘
```

### 🔧 Componentes

- **API Gateway**: Endpoints empresariales con throttling
- **Lambda Functions**: Procesamiento serverless escalable
- **EFS**: Sistema de archivos para archivos grandes (hasta GB)
- **FFmpeg Layer**: Procesamiento de audio/video nativo
- **S3**: Almacenamiento empresarial seguro
- **VPC**: Red privada para seguridad
- **CloudWatch**: Logs y monitoreo automático

### 📡 Endpoints

Después del deployment, tendrás:

- `POST /transcribe` - Transcripción de archivos
- `POST /upload` - Upload de archivos grandes
- `POST /upload/chunk` - Upload chunked

### 💰 Costos Estimados (Mensual)

Para **1000 horas de audio/mes**:
- Lambda: ~$50
- EFS: ~$30
- S3: ~$25
- API Gateway: ~$15
- **Total: ~$120/mes**

### 🔒 Seguridad Empresarial

- ✅ VPC privada
- ✅ Encriptación S3
- ✅ IAM roles mínimos
- ✅ No acceso público directo
- ✅ Compliance-ready

### 📊 Escalabilidad

- **Concurrencia**: 1000+ archivos simultáneos
- **Tamaño máximo**: Sin límite (EFS)
- **Throughput**: Automático según demanda
- **Regions**: Multi-región disponible

### 🛠️ Comandos Útiles

```bash
# Ver logs en tiempo real
cdk logs ScriptoriumStack/TranscribeLambda --follow

# Actualizar solo código
cdk deploy --hotswap

# Destruir infraestructura
cdk destroy
```

### 🎯 Para Clientes Empresariales

Esta infraestructura está diseñada para:
- ✅ **Bancos**: Compliance SOC2/GDPR
- ✅ **Universidades**: Escalabilidad masiva
- ✅ **Hospitales**: Seguridad HIPAA-ready
- ✅ **Corporaciones**: Multi-región/HA

**¡Tu sistema empresarial está listo para escalar!** 🚀