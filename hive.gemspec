$:.push File.expand_path("../lib", __FILE__)

# Maintain your gem's version:
require "hive/version"

# Describe your gem and declare its dependencies:
Gem::Specification.new do |s|
  s.name        = "hive"
  s.version     = Hive::VERSION
  s.authors     = ["Kai Schneider"]
  s.email       = ["schneikai@gmail.com"]
  s.homepage    = "https://github.com/schneikai/hive"
  s.summary     = "Hive is a instant user authentication and authorization solution based on Devise."
  s.description = s.summary

  s.files = Dir["{app,config,db,lib}/**/*", "MIT-LICENSE", "Rakefile", "README.md"]
  s.test_files = Dir["test/**/*"]

  s.add_dependency "rails", "~> 4.0"
  s.add_dependency "sass-rails", "~> 4.0"
  s.add_dependency "haml", "~> 4.0"
  s.add_dependency "haml-rails", "~> 0.4"
  s.add_dependency "coffee-rails", "~> 4.0"
  s.add_dependency "bootstrap-sass", "~> 3.0"
  s.add_dependency "animate-scss", ">= 0.0.5", "< 1"
  s.add_dependency "font-awesome-rails", ">= 4.0.3", "< 5"
  s.add_dependency "simple_form"
  s.add_dependency "country_select", "~> 1.3"

  s.add_dependency "devise", "~> 3.0"
  s.add_dependency "devise_avatarable"
  s.add_dependency "devise_authorizable"
  s.add_dependency "devise_easy_omniauthable"
  s.add_dependency "devise_attributable"

  s.add_development_dependency "thin"
  s.add_development_dependency "quiet_assets"
  s.add_development_dependency "sqlite3"
  s.add_development_dependency "jquery-rails"
end
