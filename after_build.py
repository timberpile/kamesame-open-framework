
from copy import copy
from datetime import datetime, timedelta
import os
import sys
import time
from typing import List, Union
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from dataclasses import dataclass

CWD = os.path.dirname(__file__)
DIST_DIR = os.path.join(CWD, 'dist')

REPLACE = 'Object.defineProperty(exports, "__esModule", { value: true });'


@dataclass
class FileJob:
    file_path: str
    run_at: Union[None, datetime]
    delete_at: Union[None, datetime]

    def __init__(self, path: str):
        self.file_path = path
        self.run_at = datetime.now()
        self.delete_at = None

    @property
    def rel_file_path(self):
        return self.file_path[len(DIST_DIR)+1:]

    def run(self):
        print(f'Fixing file {self.rel_file_path}')
        self.run_at = None
        self._fix_js_file(self.file_path)
        self.delete_at = datetime.now() + timedelta(seconds=0.1)

    def _fix_js_file(self, path: str):
        if not os.path.exists(path):
            return
        success = False
        while not success:
            try:
                with open(path, "r", encoding='utf-8') as f:
                    s = f.read().replace(REPLACE, "")
                with open(path, "w", encoding='utf-8') as f:
                    f.write(s)
                success = True
            except PermissionError:
                time.sleep(0.1)


@dataclass
class FileJobs:
    _jobs: List[FileJob]

    def __init__(self):
        self._jobs = []

    def find_job(self, file_path: str):
        for job in self._jobs:
            if job.file_path == file_path:
                return job
        return None

    def add(self, file_path: str):
        if self.find_job(file_path):
            pass
        else:
            self._jobs.append(FileJob(file_path))

    def remove(self, file_path: str):
        job = self.find_job(file_path)
        if job:
            self._jobs.remove(job)

    def start_checking(self):
        while True:
            for job in copy(self._jobs):
                if job.run_at is not None and job.run_at <= datetime.now():
                    job.run()
                if job.delete_at is not None and job.delete_at <= datetime.now():
                    self.remove(job.file_path)
            time.sleep(0.01)


class OnMyWatch:
    # Set the directory on watch
    watchDirectory = "dist"

    def __init__(self):
        self.observer = Observer()

    def start(self):
        event_handler = Handler()
        self.observer.schedule(
            event_handler, self.watchDirectory, recursive=True)
        self.observer.start()


class Handler(FileSystemEventHandler):

    @staticmethod
    def on_any_event(event):
        full_path = os.path.join(CWD, event.src_path)
        current_job = jobs.find_job(full_path)
        # if current_job and current_job.running:
        if current_job:
            return None
        if event.is_directory:
            return None
        if event.event_type == 'created' or event.event_type == 'modified':
            jobs.add(full_path)


if '-w' in sys.argv:
    watch = OnMyWatch()
    watch.start()
    jobs = FileJobs()

    try:
        jobs.start_checking()
    except KeyboardInterrupt as ex:
        watch.observer.stop()
        print("Observer Stopped")

    watch.observer.join()

else:
    for f in os.listdir(DIST_DIR):
        FileJob(os.path.join(DIST_DIR, f)).run()
    print('Finished fixing files!')
