def loadEnvironmentVariables(String envPrefix, Closure callback) {
    def envVars = [:]
    
    try {
        withCredentials([string(credentialsId: envPrefix, variable: 'ENV_SECRET_JSON')]) {
            if (!env.ENV_SECRET_JSON || env.ENV_SECRET_JSON.trim().isEmpty()) {
                error "Secret '${envPrefix}' está vazio"
            }
            
            def jsonSlurper = new groovy.json.JsonSlurper()
            def envSecret = jsonSlurper.parseText(env.ENV_SECRET_JSON)
            
            if (envSecret instanceof Map) {
                envSecret.each { key, value ->
                    envVars[key] = value
                }
            } else {
                error "Secret '${envPrefix}' inválido"
            }
        }
    } catch (Exception e) {
        error "Erro ao carregar secret '${envPrefix}': ${e.getMessage()}"
    }
    
    envVars.NODE_ENV = 'production'
    envVars.PORT = envVars.PORT ?: '3000'
    
    callback(envVars)
}

pipeline {
    agent any
    
    stages {
        stage('Definir Ambiente') {
            steps {
                script {
                    def branchName = scm.branches[0].name.replace('*/', '')
                    echo "Branch detectada: ${branchName}"
                    // main → Homologação (HML) | producao → Produção (PRD)
                    def envPrefix = ''
                    if (branchName == 'main') {
                        envPrefix = 'NixVet_FE_ENV_HML'
                    } else if (branchName == 'producao') {
                        envPrefix = 'NixVet_FE_ENV_PRD'
                    } else {
                        error "Branch '${branchName}' não mapeada. Use 'main' (HML) ou 'producao' (PRD)."
                    }
                    echo "Secret: ${envPrefix}"
                    
                    loadEnvironmentVariables(envPrefix) { envVars ->
                        def deployIp = envVars['SERVER_DEPLOY_IP']
                        if (!deployIp) error "SERVER_DEPLOY_IP ausente"
                        
                        env.SERVER_DEPLOY_IP = deployIp
                        
                        // .env.local para Next.js
                        def envContent = """NODE_ENV=production
NEXT_PUBLIC_API_URL=${envVars.NEXT_PUBLIC_API_URL}
NEXT_PUBLIC_META_PIXEL_ID=${envVars.NEXT_PUBLIC_META_PIXEL_ID ?: ''}
NEXT_PUBLIC_SITE_URL=${envVars.NEXT_PUBLIC_SITE_URL ?: ''}
FRONTEND_PORT=${envVars.PORT}
"""
                        writeFile file: '.env.local', text: envContent
                        // Docker Compose: porta + build args NEXT_PUBLIC_*
                        writeFile file: '.env', text: """FRONTEND_PORT=${envVars.PORT}
NEXT_PUBLIC_API_URL=${envVars.NEXT_PUBLIC_API_URL}
NEXT_PUBLIC_META_PIXEL_ID=${envVars.NEXT_PUBLIC_META_PIXEL_ID ?: ''}
NEXT_PUBLIC_SITE_URL=${envVars.NEXT_PUBLIC_SITE_URL ?: ''}
"""
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    def appPath = '/home/ubuntu/apps/NixVet_Frontend'
                    
                    // Transferir arquivos
                    sh """
                        ssh -i /root/.ssh/Jenkins8Ksoft.key ubuntu@${env.SERVER_DEPLOY_IP} "
                            sudo rm -rf ${appPath};
                            sudo mkdir -p ${appPath};
                            sudo chown ubuntu:ubuntu ${appPath}
                        "
                        scp -i /root/.ssh/Jenkins8Ksoft.key -r /var/jenkins_home/workspace/${env.JOB_NAME}/. ubuntu@${env.SERVER_DEPLOY_IP}:${appPath}
                        scp -i /root/.ssh/Jenkins8Ksoft.key .env.local ubuntu@${env.SERVER_DEPLOY_IP}:${appPath}/.env.local
                        scp -i /root/.ssh/Jenkins8Ksoft.key .env ubuntu@${env.SERVER_DEPLOY_IP}:${appPath}/.env
                    """
                    
                    // Build e Up
                    sh """
                        ssh -i /root/.ssh/Jenkins8Ksoft.key ubuntu@${env.SERVER_DEPLOY_IP} "
                            cd ${appPath} && 
                            sudo docker compose build frontend &&
                            sudo docker compose up -d --force-recreate frontend &&
                            sudo docker container prune -f
                        "
                    """
                }
            }
        }
    }
}
