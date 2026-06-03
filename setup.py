from setuptools import setup, find_packages

with open("requirements.txt") as f:
    install_requires = f.read().strip().split("\n")

setup(
    name="cpf_br",
    version="0.0.1",
    description="Adiciona campo CPF ao perfil do usuário e ao LMS no ERPNext v16",
    author="glsoltec",
    author_email="contato@glsoltec.com.br",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=install_requires,
)
