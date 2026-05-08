FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
WORKDIR /App
# Copy project files and restore dependencies
COPY . ./
RUN dotnet restore
# Build and publish the app in Release mode
RUN dotnet publish -c Release -o out
# Use a lightweight runtime image for running the app
FROM mcr.microsoft.com/dotnet/runtime:6.0
WORKDIR /App
# Copy the published output from the build stage
COPY --from=build-env /App/out
# Set the entry point for the container
ENTRYPOINT ["dotnet", "YourAppName.dll"]