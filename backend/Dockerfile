FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# 先複製 POM 提升依賴快取命中率
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

# 複製原始碼並打包
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app

# 只帶可執行 jar 進最終映像
COPY --from=build /app/target/*.jar /app/app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
