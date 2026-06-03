#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <libgen.h>
#include <sys/stat.h>

int file_exists(const char *path) {
    struct stat buffer;
    return (stat(path, &buffer) == 0);
}

int main(int argc, char *argv[]) {
    char exe_path[1024];
    memset(exe_path, 0, sizeof(exe_path));
    
    // Get the path of the current executable
    ssize_t len = readlink("/proc/self/exe", exe_path, sizeof(exe_path) - 1);
    if (len == -1) {
        perror("readlink");
        return 1;
    }
    
    // Get the directory of the executable
    char *exe_dir = dirname(exe_path);
    
    char script_path[2048];
    char *tauri_resource_dir = getenv("TAURI_RESOURCE_DIR");
    
    // Candidate 1: Check with TAURI_RESOURCE_DIR (if set)
    if (tauri_resource_dir != NULL && strlen(tauri_resource_dir) > 0) {
        // Try under _up_/models (Tauri's bundled layout for relative parent paths)
        snprintf(script_path, sizeof(script_path), "%s/_up_/models/inference_server.py", tauri_resource_dir);
        if (file_exists(script_path)) goto found;

        // Try under models/
        snprintf(script_path, sizeof(script_path), "%s/models/inference_server.py", tauri_resource_dir);
        if (file_exists(script_path)) goto found;
    }
    
    // Candidate 2: Check relative to exe_dir
    // Try development workspace (binary in src-tauri/target/release, models at root)
    snprintf(script_path, sizeof(script_path), "%s/../../models/inference_server.py", exe_dir);
    if (file_exists(script_path)) goto found;

    // Try packaged layout with _up_/models
    snprintf(script_path, sizeof(script_path), "%s/_up_/models/inference_server.py", exe_dir);
    if (file_exists(script_path)) goto found;

    // Try standard models directory
    snprintf(script_path, sizeof(script_path), "%s/models/inference_server.py", exe_dir);
    if (file_exists(script_path)) goto found;
    
    // Try Tauri resources directory under exe_dir
    snprintf(script_path, sizeof(script_path), "%s/resources/models/inference_server.py", exe_dir);
    if (file_exists(script_path)) goto found;

    // Try Tauri resources directory next to exe_dir
    snprintf(script_path, sizeof(script_path), "%s/../resources/models/inference_server.py", exe_dir);
    if (file_exists(script_path)) goto found;

    // Try relative to exe_dir's parent
    snprintf(script_path, sizeof(script_path), "%s/../models/inference_server.py", exe_dir);
    if (file_exists(script_path)) goto found;

    // Candidate 3: Check relative to current working directory
    snprintf(script_path, sizeof(script_path), "_up_/models/inference_server.py");
    if (file_exists(script_path)) goto found;

    snprintf(script_path, sizeof(script_path), "models/inference_server.py");
    if (file_exists(script_path)) goto found;

    fprintf(stderr, "[launcher] Error: models/inference_server.py not found in search paths.\n");
    return 1;

found:
    printf("[launcher] Found inference server script at: %s\n", script_path);
    fflush(stdout);
    
    // Prepare arguments for execvp
    // We want to execute: python3 <script_path> [original_args...]
    char **new_argv = malloc((argc + 2) * sizeof(char *));
    new_argv[0] = "python3";
    new_argv[1] = script_path;
    for (int i = 1; i < argc; i++) {
        new_argv[i + 1] = argv[i];
    }
    new_argv[argc + 1] = NULL;
    
    // Execute python3
    execvp("python3", new_argv);
    
    // If execvp returns, an error occurred
    perror("execvp failed to start python3");
    free(new_argv);
    return 1;
}
