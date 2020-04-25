import os
import stat
from shutil import rmtree, copyfile
from subprocess import check_call
from colorama import Fore, Back, Style


def makedirs_silent(root):
    try:
        os.makedirs(root)
    except OSError:                            # mute if exists
        pass


def rmtree_silent(root):
    def remove_readonly_handler(fn, root, excinfo):
        if fn is os.rmdir:
            if os.path.isdir(root):            # if exists
                os.chmod(root, stat.S_IWRITE)  # make writable
                os.rmdir(root)
        elif fn is os.remove:
            if os.path.isfile(root):           # if exists
                os.chmod(root, stat.S_IWRITE)  # make writable
                os.remove(root)
    rmtree(root, onerror=remove_readonly_handler)
    makedirs_silent(root)


if __name__ == "__main__":
    if os.path.exists("_posts"):
        try:
            print(Fore.YELLOW + "Clean File and reset...")
            if os.path.exists("_config.yml"):
                os.remove("_config.yml")
                pass

            copyfile("_data/_config.yml.default", "_config.yml")

            rmtree_silent("_posts")
            rmtree_silent("page")
            rmtree_silent("_data")

            if os.path.exists("ads.txt"):
                os.remove("ads.txt")
                pass

            print(Fore.GREEN + "DONE !")

        except IOError:
            print(Fore.RED + "init fail")
            raise

    print(Fore.GREEN + "All Done")
