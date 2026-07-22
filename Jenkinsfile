pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Deploy') {
    steps {
        dir('backend') {
            withCredentials([file(credentialsId: 'env-file', variable: 'ENV_FILE')]) {
                bat 'copy "%ENV_FILE%" ".env"'
                bat 'docker compose down'
                bat 'docker compose up --build -d'
            }
        }
    }
}
    }
}