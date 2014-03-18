module Hive
  class InstallGenerator < Rails::Generators::Base
    source_root File.expand_path('../templates', __FILE__)

    class_option :copy_migrations, desc: "Copy migrations from engine to app. Set this to 'false' if you install to the 'test/dummy' app.", type: :boolean, default: true

    # Remember: Do not copy migrations if you install to 'test/dummy' app!
    def copy_migrations
      return unless options.copy_migrations?

      say_status :copying, "migrations"
      Dir.chdir(Rails.root) do
        # Side note: This will fail wenn you run the install generator inside
        # <tt>test/dummy</tt> with error <tt>Don't know how to build task 'hive:install:migrations'</tt>.
        # Not sure if the dummy app just don't need the migrations because they're
        # part of the engine anyway or if it's a bug...
        `rake hive:install:migrations`
      end
    end

    def copy_initializer
      template "initializer.rb", "config/initializers/hive.rb"
    end

    def copy_user
      template "user.rb", "app/models/user.rb"
    end

    def copy_user_ability
      template "user_ability.rb", "app/models/user_ability.rb"
    end

    def create_route
      route "hive_for :users"
    end

    def require_javascripts
      insert_into_file "app/assets/javascripts/application#{detect_js_format[0]}",
        "#{detect_js_format[1]} require hive\n", :after => "jquery_ujs\n"
    end

    def require_stylsheets
      insert_into_file "app/assets/stylesheets/application#{detect_css_format[0]}",
        " *= require hive\n", :before => "*/"
    end

    def show_readme
      readme "README" if behavior == :invoke
    end


    private
      # Taken from
      # https://github.com/groundworkcss/groundworkcss-rails/blob/master/lib/groundworkcss/generators/install_generator.rb
      def detect_js_format
        return ['.js', '//='] if File.exist?('app/assets/javascripts/application.js')
        return ['.js.coffee', '#='] if File.exist?('app/assets/javascripts/application.js.coffee')
        return ['.coffee', '#='] if File.exist?('app/assets/javascripts/application.coffee')
        return false
      end

      def detect_css_format
        return ['.css'] if File.exist?('app/assets/stylesheets/application.css')
        return ['.css.sass'] if File.exist?('app/assets/stylesheets/application.css.sass')
        return ['.css.scss'] if File.exist?('app/assets/stylesheets/application.css.scss')
        return ['.sass'] if File.exist?('app/assets/stylesheets/application.sass')
        return ['.scss'] if File.exist?('app/assets/stylesheets/application.scss')
        return false
      end

  end
end
