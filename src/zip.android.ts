import * as fs from 'tns-core-modules/file-system';

// zip4j docs:
// http://javadox.com/net.lingala.zip4j/zip4j/1.3.1/net/lingala/zip4j
// progress example:
// http://www.lingala.net/zip4j/forum/index.php?topic=68.0

declare const net;

export class Zip {
    public static ProgressUpdateRate = 100;

    public static zip(folder, destination, keepParent, password) {
        return this.zipWithProgress(
            folder,
            destination,
            () => {
            },
            keepParent,
            password
        );
    }

    public static zipWithProgress(
        folder,
        destination,
        progressCallback,
        keepParent = true,
        password?: boolean
    ): Promise<any> {
        return new Promise(function (resolve, reject) {
            if (!fs.Folder.exists(folder)) {
                return reject('Folder does not exist, invalid folder path: ' + folder);
            }
            try {
                if (fs.File.exists(destination)) {
                    const f = fs.File.fromPath(destination);
                    f.remove().then(
                        function (result) {
                            const temp = fs.knownFolders.temp();
                            const tempDestinationPath = fs.path.join(temp.path, 'archive.zip');
                            const zipFile = new net.lingala.zip4j.core.ZipFile(
                                tempDestinationPath
                            );
                            zipFile.setRunInThread(true);
                            if (password) {
                                zipFile.setPassword(password);
                            }
                            const parameters = new net.lingala.zip4j.model.ZipParameters();
                            parameters.setCompressionMethod(
                                net.lingala.zip4j.util.Zip4jConstants.COMP_DEFLATE
                            );
                            parameters.setCompressionLevel(
                                net.lingala.zip4j.util.Zip4jConstants.DEFLATE_LEVEL_NORMAL
                            );
                            zipFile.createZipFileFromFolder(folder, parameters, false, 0);
                            const monitor_1 = zipFile.getProgressMonitor();
                            const progressInterval_1 = setInterval(function () {
                                if (monitor_1.getState() === net.lingala.zip4j.progress.ProgressMonitor.STATE_BUSY) {
                                    if (progressCallback)
                                        progressCallback(monitor_1.getPercentDone());
                                } else {
                                    const result = monitor_1.getResult();
                                    if (result === net.lingala.zip4j.progress.ProgressMonitor.RESULT_SUCCESS) {
                                        const sourceFile = fs.File.fromPath(tempDestinationPath);
                                        const destinationFile = fs.File.fromPath(destination);

                                        const source = sourceFile.readSync(function (error) {
                                            reject('error');
                                        });
                                        destinationFile.writeSync(source, function (error) {
                                            reject('error');
                                        });
                                        resolve();
                                        temp.clear();
                                    } else if (result === net.lingala.zip4j.progress.ProgressMonitor.RESULT_ERROR) {
                                        reject(
                                            monitor_1.getException()
                                                ? monitor_1.getException().getMessage()
                                                : 'error'
                                        );
                                    } else {
                                        reject('cancelled');
                                    }
                                    clearInterval(progressInterval_1);
                                }
                            }, Zip.ProgressUpdateRate);
                        },
                        function (error) {
                            reject(error);
                        }
                    );
                } else {
                    const zipFile = new net.lingala.zip4j.core.ZipFile(destination);
                    zipFile.setRunInThread(true);
                    if (password) {
                        zipFile.setPassword(password);
                    }
                    const parameters = new net.lingala.zip4j.model.ZipParameters();
                    parameters.setCompressionMethod(
                        net.lingala.zip4j.util.Zip4jConstants.COMP_DEFLATE
                    );
                    parameters.setCompressionLevel(
                        net.lingala.zip4j.util.Zip4jConstants.DEFLATE_LEVEL_NORMAL
                    );
                    zipFile.createZipFileFromFolder(folder, parameters, false, 0);
                    const monitor_1 = zipFile.getProgressMonitor();
                    const progressInterval_1 = setInterval(function () {
                        if (monitor_1.getState() === net.lingala.zip4j.progress.ProgressMonitor.STATE_BUSY) {
                            if (progressCallback)
                                progressCallback(monitor_1.getPercentDone());
                        } else {
                            const result = monitor_1.getResult();
                            if (result === net.lingala.zip4j.progress.ProgressMonitor.RESULT_SUCCESS) {
                                resolve();
                            } else if (result === net.lingala.zip4j.progress.ProgressMonitor.RESULT_ERROR) {
                                reject(
                                    monitor_1.getException()
                                        ? monitor_1.getException().getMessage()
                                        : 'error'
                                );
                            } else {
                                reject('cancelled');
                            }
                            clearInterval(progressInterval_1);
                        }
                    }, Zip.ProgressUpdateRate);
                }
            } catch (ex) {
                reject(ex);
            }
        });
    }

    public static unzipWithProgress(
        archive: string,
        destination: string,
        progressCallback: (progressPercent) => void,
        overwrite?: boolean,
        password?: string
    ): Promise<any> {
        if (!fs.File.exists(archive)) {
            return Promise.reject(
                `File does not exist, invalid archive path: ${archive}`
            );
        }
        return new Promise((resolve, reject) => {
            try {
                const zipFile = new net.lingala.zip4j.core.ZipFile(archive);
                zipFile.setRunInThread(true);
                if (zipFile.isEncrypted() && password) {
                    zipFile.setPassword(password);
                }


                const d = new java.io.File(destination);

                if (!d.exists()) {
                    d.mkdirs();
                }

                let fileHeaders = zipFile.getFileHeaders();
                if (fileHeaders) {
                    const length = fileHeaders.size();
                    for (let i = 0; i < length; i++) {
                        const header = fileHeaders.get(i);
                        if (header.isDirectory()) {
                            if (d.exists()) {
                                const f = new java.io.File(destination, header.getFileName());
                                f.mkdirs();
                                zipFile.extractFile(header, f.toString());
                            }
                        }
                    }
                }

                const monitor = zipFile.getProgressMonitor();
                zipFile.extractAll(destination);
                const progressInterval = setInterval(() => {
                    if (monitor.getState() === net.lingala.zip4j.progress.ProgressMonitor.STATE_BUSY) {
                        if (progressCallback) progressCallback(monitor.getPercentDone());
                    } else {
                        // Done working
                        const result = monitor.getResult();
                        if (result === net.lingala.zip4j.progress.ProgressMonitor.RESULT_SUCCESS) {
                            resolve();
                        } else if (result === net.lingala.zip4j.progress.ProgressMonitor.RESULT_ERROR) {
                            reject(
                                monitor.getException()
                                    ? monitor.getException().getMessage()
                                    : 'error'
                            );
                        } else {
                            reject('cancelled');
                        }
                        clearInterval(progressInterval);
                    }
                }, Zip.ProgressUpdateRate);
            } catch (ex) {
                reject(ex);
            }
        });
    }

    public static unzip(
        archive: string,
        destination: string,
        overwrite?: boolean,
        password?: string
    ): Promise<any> {
        return this.unzipWithProgress(
            archive,
            destination,
            () => {
            },
            overwrite,
            password
        );
    }
}
