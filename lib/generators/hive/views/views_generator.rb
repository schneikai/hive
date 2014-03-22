module Hive
  class ViewsGenerator < Rails::Generators::Base
    source_root File.expand_path("../../../../../app/views", __FILE__)

    argument :view_directories, type: :array, required: false, default: nil, banner: 'mailer shared', desc: "What views to copy. Optional. Will copy all views if not specified."

    def copy_views
      if view_directories.any?
        # Copy selected views.
        view_directories.each do |dir|
          directory File.join('hive', dir), target_path(dir)
        end
      else
        # Copy all views.
        directory 'hive', target_path
      end
    end

    def self.usage_path
      path = File.expand_path("../USAGE", __FILE__)
      path if File.exists?(path)
    end

    private
      def target_path(dir=nil)
        File.join('app', 'views', 'hive', dir)
      end

  end
end
